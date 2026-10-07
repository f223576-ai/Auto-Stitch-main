import './VisitingCard.css';

export default function VisitingCard({ name, image, addressLines = [], phone, email }) {
  return (
    <article className="visiting-card">
      <div className="visiting-card-photo-wrap">
        {image ? (
          <img src={image} alt={name ? `${name} visiting card` : 'Visiting card'} className="visiting-card-photo" />
        ) : (
          <div className="visiting-card-photo visiting-card-photo-empty">
            <span>Portrait</span>
          </div>
        )}
      </div>
      <div className="visiting-card-body">
        <p className="visiting-card-kicker">Visiting card</p>
        {name && <h3 className="visiting-card-name">{name}</h3>}
        <span className="visiting-card-rule" />
        {addressLines.length > 0 && (
          <p className="visiting-card-address">{addressLines.join('\n')}</p>
        )}
        {(phone || email) && (
          <div className="visiting-card-contact">
            {phone && <span>{phone}</span>}
            {email && <span>{email}</span>}
          </div>
        )}
      </div>
    </article>
  );
}
