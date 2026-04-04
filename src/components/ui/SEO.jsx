import { Helmet } from 'react-helmet-async';

export default function SEO({ 
  title = "Smiris Learn | Plateforme SaaS de Formation en Ligne", 
  description = "Transformez vos connaissances en succès avec Smiris Learn. La plateforme LMS nouvelle génération pour entreprises et formateurs. Créez, gérez et vendez vos formations avec facilité.",
  keywords = "LMS, SaaS, formation en ligne, e-learning, plateforme éducation, Smiris Learn, quiz, vidéos",
  image = "/og-image.png",
  url = "https://smiris-learn.app" 
}) {
  return (
    <Helmet>
      {/* Balises Méta de Base */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
      
      {/* Favicon & Theme */}
      <link rel="canonical" href={url} />
      <meta name="theme-color" content="#6366f1" />
    </Helmet>
  );
}
