import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

const isAndroid = /Android/i.test(navigator.userAgent)

if (isAndroid) {
  const desktopWidth = 1280

  const applyDesktopModeScale = () => {
    const scale = Math.min(window.innerWidth / desktopWidth, 1)

    let viewport = document.querySelector('meta[name="viewport"]')
    if (!viewport) {
      viewport = document.createElement('meta')
      viewport.setAttribute('name', 'viewport')
      document.head.appendChild(viewport)
    }

    viewport.setAttribute(
      'content',
      `width=${desktopWidth}, initial-scale=${scale}, maximum-scale=${scale}, user-scalable=no`
    )

    document.documentElement.style.minWidth = `${desktopWidth}px`
    document.body.style.minWidth = `${desktopWidth}px`
  }

  applyDesktopModeScale()
  window.addEventListener('resize', applyDesktopModeScale)
}

createRoot(document.getElementById('root')).render(
  <HashRouter>
    <App />
  </HashRouter>
)
