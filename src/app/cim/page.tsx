// Server component: reads the local "CIM Analyzer" folder live on every request
// (loadCims / loadPortfolio re-read the Excel + file lists), so the lists update
// the moment a PDF is dropped or a row is added. The heavy fs/xlsx code stays on
// the server; only plain data crosses to the <CimAnalyzer/> client component.

import { CimAnalyzer } from '../components/CimAnalyzer'
import { loadCims, loadPortfolio } from '@/lib/cim'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'CIM Analyzer · Claudia',
}

export default async function CimPage() {
  const [cims, portfolio] = await Promise.all([loadCims(), loadPortfolio()])

  return (
    <CimAnalyzer
      cims={cims.data}
      portfolio={portfolio.data}
      cimError={cims.error}
      portfolioError={portfolio.error}
    />
  )
}
