interface TripHeaderProps {
  title: string
  destination?: string | null
}

export default function TripHeader({ title, destination }: TripHeaderProps) {
  return (
    <div className="desktop-header">
      <h2 className="page-title">{title}</h2>
      {destination && <p className="page-subtitle">{destination}</p>}
    </div>
  )
}
