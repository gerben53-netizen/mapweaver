import { loadAnnotationFonts, fontFailures } from './canvas/annotationFonts'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './styles/global.css'

void loadAnnotationFonts().then(()=>createRoot(document.getElementById('root')!).render(
  <StrictMode>{fontFailures.length>0&&<p role="alert">Some bundled fonts could not load ({fontFailures.join(', ')}). Text and PNG export use fallback fonts. Restore the fonts folder and reload.</p>}<App /></StrictMode>,
))
