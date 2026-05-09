import os
import json
import warnings
from typing import List, Tuple
import httpx
from app.config import get_settings

settings = get_settings()

# 统一的 OpenAI-compatible API 客户端
_http_client = httpx.Client(timeout=60.0)


def _call_llm(
    messages: List[dict],
    model: str,
    base_url: str = "",
    api_key: str = "",
    temperature: float = 0.7,
    max_tokens: int = 2000,
) -> str:
    """调用 OpenAI-compatible API"""
    _base_url = base_url or settings.llm_base_url
    _api_key = api_key or settings.llm_api_key

    # 检查是否是开发模式（无真实后端）
    if _base_url == "http://localhost:8000/v1" and not _check_service_alive():
        warnings.warn("LLM service not available, using fallback/mock mode.")
        return ""

    try:
        resp = _http_client.post(
            f"{_base_url}/chat/completions",
            headers={"Authorization": f"Bearer {_api_key}", "Content-Type": "application/json"},
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


def _call_llm_with_images(
    messages: List[dict],
    images: List[str],
    model: str,
    base_url: str,
    api_key: str,
    temperature: float = 0.7,
    max_tokens: int = 3000,
) -> str:
    """调用支持 vision 的 OpenAI-compatible API"""
    if not base_url or not model:
        return ""

    # 构建多模态消息：把原有 user message 的文字内容保留，再追加图片
    multimodal_messages = []
    user_content = []
    for msg in messages:
        if msg.get("role") == "user":
            text = msg.get("content", "")
            if text:
                user_content.append({"type": "text", "text": text})
            # 插入图片（限制数量避免 token 爆炸）
            for img_url in images[:8]:
                user_content.append({"type": "image_url", "image_url": {"url": img_url}})
            multimodal_messages.append({"role": "user", "content": user_content})
        else:
            multimodal_messages.append(msg)

    try:
        resp = _http_client.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": multimodal_messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        warnings.warn(f"Vision LLM call failed: {e}")
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
    "literary": """文艺散文风。
要求：
- 从碎片中提取意象（光影、气味、声音、触感），不要罗列事件
- 情感要有层次：初见→沉浸→离别/回味，形成情绪弧线
- 善用比喻和通感，但不过分堆砌辞藻
- 段落间用留白和过渡制造呼吸感，不要密集叙事
- 像一篇发表在《单读》或《旅行家》上的散文""",
    "casual": """轻松碎碎念风。
要求：
- 像给老朋友发长语音转文字，自然、松弛、有口头禅
- 保留吐槽和意外感（"结果到了才发现…""谁知道…"）
- 不追求完整叙事，可以跳跃、走神、忽然想起别的事
- 有俏皮和自嘲，但不过度表演
- 结尾可以突然收住，不要强行升华""",
    "observational": """博物观察风。
要求：
- 从具体细节切入：一株植物的形态、一道菜的做法、一座建筑的年轮
- 由物及人，由景及思，不要停留在"很好看"的层面
- 保留数据的精确感（温度、方位、时辰），但用文学语言包裹
- 像一位人类学家的田野笔记，既有客观描述，也有私人感悟
- 结构上允许非线性，按"观察对象"而非"时间顺序"组织""",
}


_ESSAY_SYSTEM_PROMPT = """你是一位旅行文学编辑。用户旅途中随手记下了一些片段（可能很零散、口语化、甚至前言不搭后语），你的任务是把它们**改写成一篇完整的旅行文章**。

绝对禁止的行为：
1. 禁止按时间顺序流水账复述碎片内容
2. 禁止把每个碎片单独写成一段（"接下来…""然后…"）
3. 禁止把用户的口语原话直接拼接成文
4. 禁止虚构用户没有经历的事情

必须做到的创作要求：
1. **提炼主题**：从所有碎片中提炼出 2-4 个核心主题或场景（如"雨中的古镇""一道改变印象的菜""陌生人的善意"）
2. **跨碎片整合**：把表达相似感受的碎片合并到同一个段落，不要一个碎片一段
3. **重新组织**：按主题和情感递进编排段落顺序，而非时间顺序
4. **文学转化**：用户的原话只作为素材和灵感，你要用自己的语言重新表达，可偶尔引用一两句点睛
5. **情感弧线**：文章要有开头（氛围引入）→ 中段（展开与深入）→ 结尾（余韵或顿悟）
6. **感官描写**：至少包含视觉以外的两种感官（听觉、嗅觉、触觉、味觉）
7. 总字数 800-1500 字

输出格式：
标题：（一个贴切、有意境的标题，不要叫"旅行小记"）

（正文，不要加场景序号，用小标题或自然过渡分段）
"""


def _build_essay_prompt(fragments, style: str) -> Tuple[str, List[str]]:
    style_desc = _STYLE_PROMPTS.get(style, _STYLE_PROMPTS["casual"])

    lines = [
        "以下是用户在旅途中随手记下的片段，每个片段可能包含文字和照片。",
        "请把它们作为素材和灵感，重新创作成一篇完整的旅行文章。不要复述，要创作。",
        "",
        "【旅途片段】",
    ]
    images: List[str] = []
    for f in fragments:
        tags = ", ".join(f.tags) if f.tags else ""
        tag_prefix = f"[{tags}] " if tags else ""
        lines.append(f"• {tag_prefix}{f.content}")
        if f.photos:
            lines.append(f"  [配图：{len(f.photos)}张]")
            images.extend(f.photos)

    lines.append("")
    lines.append("【风格要求】")
    lines.append(style_desc)
    lines.append("")
    lines.append("请结合以上文字和照片进行创作。")
    return "\n".join(lines), images[:8]


def generate_essay(fragments, style: str = "casual") -> Tuple[str, str]:
    """生成小记，返回 (title, content)"""
    if not fragments:
        return "空行程", "暂无记录可生成小记。"

    prompt_text, images = _build_essay_prompt(fragments, style)

    # 优先使用 vision LLM（如果配置了且有图片）
    if images and settings.vision_base_url and settings.vision_model:
        result = _call_llm_with_images(
            messages=[
                {"role": "system", "content": _ESSAY_SYSTEM_PROMPT},
                {"role": "user", "content": prompt_text},
            ],
            images=images,
            model=settings.vision_model,
            base_url=settings.vision_base_url,
            api_key=settings.vision_api_key,
            temperature=0.8,
            max_tokens=3000,
        )
    else:
        result = _call_llm(
            messages=[
                {"role": "system", "content": _ESSAY_SYSTEM_PROMPT},
                {"role": "user", "content": prompt_text},
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
