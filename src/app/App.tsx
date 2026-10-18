import { Logo } from '../components/Logo.tsx'
import { colors, fonts } from '../theme'

export default function App() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 112,
          height: 112,
          borderRadius: 28,
          background: colors.green900,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Logo size={80} color={colors.cream} />
      </div>
      <h1 style={{ margin: 0, fontFamily: fonts.serif, fontSize: 30, fontWeight: 500 }}>
        Ogarnij <em style={{ color: colors.brass700 }}>życie</em>
      </h1>
    </main>
  )
}
