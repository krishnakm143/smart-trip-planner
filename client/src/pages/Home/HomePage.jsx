import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import Hero from './Hero'
import HowItWorks from './HowItWorks'
import PopularDestinations from './PopularDestinations'

export default function HomePage() {
  useDocumentTitle('')

  return (
    <>
      <Hero />
      <HowItWorks />
      <PopularDestinations />
    </>
  )
}
