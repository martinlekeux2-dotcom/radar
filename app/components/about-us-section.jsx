import Image from "next/image";

export default function AboutUsSection({ aboutUs, standalone = false }) {
  const Heading = standalone ? "h1" : "h2";

  return (
    <section aria-labelledby="about-us-title" className="about-us-section" id="qui-sommes-nous">
      <div className="page-shell">
        <div className="about-us-heading">
          <div>
            <p className="eyebrow">Qui sommes-nous ?</p>
            <Heading className="headline" id="about-us-title">{aboutUs.title}</Heading>
          </div>
          <span className="about-us-stamp">RADAR<br />EN COULISSES</span>
        </div>
        <div className="about-us-photo-grid">
          {[1, 2, 3, 4].map((number) => {
            const person = {
              firstName: aboutUs[`first_name_${number}`],
              url: aboutUs[`photo_${number}_url`],
              alt: aboutUs[`photo_${number}_alt`],
              text: aboutUs[`text_${number}`],
            };

            return (
              <article className={`about-us-person-card about-us-person-card-${number}`} key={`person-${number}`}>
                <h3 className="about-us-person-name">{person.firstName}</h3>
                <div className="about-us-photo">
                  <Image
                    alt={person.alt || `Photo de ${person.firstName}`}
                    fill
                    sizes="(max-width: 760px) 72vw, (max-width: 1050px) 45vw, 23vw"
                    src={person.url}
                    unoptimized
                  />
                </div>
                <p className="about-us-person-text">{person.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
