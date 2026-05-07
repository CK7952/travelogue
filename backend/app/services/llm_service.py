import os
import json
import warnings
from typing import List, Tuple
import httpx
from app.config import get_settings

settings = get_settings()

# 统一的 OpenAI-compatible API 客户端
_http_client = httpx.Client(timeout=60.0)


def _call_llm(messages: List[dict], model: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
    """调用 OpenAI-compatible API"""
    # 检查是否是开发模式（无真实后端）
    if settings.llm_base_url == "http://localhost:8000/v1" and not _check_service_alive():
        warnings.warn("LLM service not available, using fallback/mock mode.")
        return ""

    try:
        resp = _http_client.post(
            f"{settings.llm_base_url}/chat/completions",
            headers={"Authorization": f"Bearer {settings.llm_api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        warnings.warn(f"LLM call failed: {e}")
        return ""


def _check_service_alive() -> bool:
    """简单探测 LLM 服务是否存活"""
    try:
        r = httpx.get(settings.llm_base_url.replace("/v1", "/health"), timeout=2.0)
        return r.status_code == 200
    except Exception:
        return False


# ==================== 口语清理 ====================
_CLEAN_PROMPT = """你是一名口语整理助手。你的任务是将用户的口语化语音转写文本进行极简清理。

规则（必须严格遵守）：
1. 只删除无意义的填充词：嗯、啊、呃、那个、就是、然后、你知道吧、对吧
2. 修复明显的重复结巴（如"我我我"→"我"）
3. 保持原句的词汇、语序、语法结构不变
4. 不要扩写、不要润色、不要补充信息、不要改写成更"通顺"的句子
5. 如果原文有轻微语病，保留它，那是用户的个人风格

输入：
{text}

只输出清理后的文本，不要任何解释、不要引号包裹。"""


def clean_transcript(raw_text: str) -> str:
    """保守清理口语转写文本"""
    if not raw_text or raw_text.strip() == "" or "占位文本" in raw_text:
        return raw_text

    result = _call_llm(
        messages=[
            {"role": "system", "content": "你是一名极简口语清理助手，只删填充词，不改原意。"},
            {"role": "user", "content": _CLEAN_PROMPT.format(text=raw_text)},
        ],
        model=settings.llm_model_clean,
        temperature=0.1,
        max_tokens=1000,
    )

    # Fallback: 如果LLM不可用，做简单的规则清理
    if not result:
        result = _fallback_clean(raw_text)
    return result


def _fallback_clean(text: str) -> str:
    fillers = ["嗯", "啊", "呃", "那个", "就是", "然后", "你知道吧", "对吧", "那个那个"]
    for f in fillers:
        text = text.replace(f, "")
    # 去多余空格
    text = " ".join(text.split())
    return text.strip()


# ==================== 标签建议 ====================
_TAG_PROMPT = """根据以下旅行感悟文本，给出3-5个最贴切的标签。

可选标签池（优先从中选，也可自创）：
食物、风景、天气、人情、建筑、吐槽、感慨、惊喜、疲惫、历史文化、自然、城市、乡村、交通、住宿

要求：
- 只输出标签列表
- 格式：tag1, tag2, tag3
- 不要解释

文本：{text}"""


def suggest_tags(text: str) -> List[str]:
    """为碎片文本建议标签"""
    if not text or len(text) < 3:
        return []

    result = _call_llm(
        messages=[{"role": "user", "content": _TAG_PROMPT.format(text=text)}],
        model=settings.llm_model_clean,
        temperature=0.3,
        max_tokens=100,
    )

    if not result:
        return []

    # 解析 "食物, 天气, 人情" → list
    tags = [t.strip() for t in result.replace("，", ",").split(",") if t.strip()]
    return tags[:5]


# ==================== 小记生成 ====================
_STYLE_PROMPTS = {
    "literary": "文艺散文风：语言优美，善用意象和比喻，情感细腻，段落间有过渡和留白。像一篇发表在旅行杂志上的散文。",
    "casual": "轻松碎碎念风：像和好友聊天一样自然、口语化，保留吐槽和即兴感，偶尔俏皮，不刻意雕琢。",
    "observational": "博物观察风：客观、具体，注重细节描写和场景还原，像一篇带有个人色彩的考察笔记。",
}


_ESSAY_SYSTEM_PROMPT = """你是一位旅行作家，负责将用户的旅途碎片记录整合成一篇完整的旅行小记。

写作原则：
1. 所有内容必须基于用户提供的真实碎片，不虚构任何经历
2. 保留用户的原话风格和情感色彩
3. 按时间线和地理移动组织段落，场景之间有过渡
4. 每个场景提炼一个小标题（不加序号，用诗意或贴切的短语）
5. 适当引用用户的原话（用引号标出），增加真实感
6. 总字数控制在800-1500字之间

输出格式：
标题：（为整篇小记起一个贴切标题）

（正文，分段，每段前加场景小标题）
"""


def _build_essay_prompt(fragments, style: str) -> str:
    style_desc = _STYLE_PROMPTS.get(style, _STYLE_PROMPTS["casual"])

    lines = ["【用户碎片记录】"]
    for i, f in enumerate(fragments, 1):
        time_str = f.recorded_at.strftime("%m-%d %H:%M") if f.recorded_at else "未知时间"
        loc = f"({f.latitude:.4f}, {f.longitude:.4f})" if f.latitude and f.longitude else ""
        tags = ", ".join(f.tags) if f.tags else "无标签"
        lines.append(f"\n--- 碎片{i} ---")
        lines.append(f"时间：{time_str} {loc}")
        lines.append(f"标签：{tags}")
        lines.append(f"内容：{f.content}")

    lines.append(f"\n【写作要求】")
    lines.append(style_desc)
    lines.append("请基于以上真实碎片，写一篇完整的旅行小记。")
    return "\n".join(lines)


def generate_essay(fragments, style: str = "casual") -> Tuple[str, str]:
    """生成小记，返回 (title, content)"""
    if not fragments:
        return "空行程", "暂无记录可生成小记。"

    prompt = _build_essay_prompt(fragments, style)

    result = _call_llm(
        messages=[
            {"role": "system", "content": _ESSAY_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        model=settings.llm_model_essay,
        temperature=0.8,
        max_tokens=3000,
    )

    if not result:
        # Fallback: 拼接碎片
        return _fallback_essay(fragments, style)

    # 解析标题和正文
    title = "旅行小记"
    content = result
    if result.startswith("标题："):
        parts = result.split("\n", 1)
        title = parts[0].replace("标题：", "").strip()
        content = parts[1].strip() if len(parts) > 1 else result

    return title, content


def _fallback_essay(fragments, style: str) -> Tuple[str, str]:
    """LLM不可用时，用规则拼接保底"""
    lines = ["# 旅行小记\n"]
    for f in fragments:
        time_str = f.recorded_at.strftime("%m-%d %H:%M") if f.recorded_at else ""
        lines.append(f"**{time_str}** {f.content}\n")
    return "旅行小记", "\n".join(lines)
