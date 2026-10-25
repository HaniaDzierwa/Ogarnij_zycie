import { useState } from 'react'
import { useNavigate } from 'react-router'
import { paths } from '../../app/screens.ts'
import { AuthError, authErrorMessage } from '../../auth/auth.ts'
import { Accent, Header } from '../../components/Header.tsx'
import { TabBar } from '../../components/TabBar.tsx'
import { Card, Chip, ConfirmDialog, Field, Screen, Segmented } from '../../components/ui.tsx'
import { useStore } from '../../data/store.ts'
import { useHouse, type DeleteMode } from '../../house/house.ts'
import { colors, fonts, priorities } from '../../theme'

/**
 * Ustawienia → „Usuń konto” (etap 7, decyzja Hani 2026-10-18 / 2026-10-25). Domownik – wychodzi z
 * domu; założyciel sam w domu – dom znika; założyciel z domownikami – przekazuje dom wybranemu
 * albo usuwa go u wszystkich. Potwierdzenie hasłem (wymaga tego Firebase).
 */
export function DeleteAccountScreen() {
  const { members, currentUid, houseName } = useStore()
  const house = useHouse()
  const navigate = useNavigate()
  const me = members.find((m) => m.uid === currentUid)
  const others = members.filter((m) => m.uid !== currentUid)
  const owner = me?.role === 'owner'
  const [choice, setChoice] = useState<'transfer' | 'delete-house'>('transfer')
  const [to, setTo] = useState(others[0]?.uid ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const mode: DeleteMode = !owner
    ? { kind: 'leave' }
    : !others.length
      ? { kind: 'delete-house' }
      : choice === 'transfer'
        ? { kind: 'transfer', to }
        : { kind: 'delete-house' }
  const newOwner = others.find((m) => m.uid === to)
  const name = houseName || 'Wasz dom'

  const summary =
    mode.kind === 'leave'
      ? `Opuścisz dom „${name}”. Wspólne zadania i wydarzenia zostają u domowników. Twoje „Tylko ja”, ustawienia i konto zostaną usunięte na zawsze.`
      : mode.kind === 'transfer'
        ? `Dom „${name}” przejmie ${newOwner?.name ?? 'wybrany domownik'} – wspólne zadania i kalendarz zostają. Twoje „Tylko ja”, ustawienia i konto zostaną usunięte na zawsze.`
        : others.length
          ? `Dom „${name}” zostanie usunięty u wszystkich – razem ze wspólnymi zadaniami, wydarzeniami i kategoriami. Domownicy wrócą do ekranu „Witaj”. Tego nie da się cofnąć.`
          : `Dom „${name}” zostanie usunięty razem ze wszystkimi zadaniami, wydarzeniami i kategoriami. Tego nie da się cofnąć.`

  const remove = async () => {
    setConfirming(false)
    setBusy(true)
    setError(null)
    try {
      await house.deleteAccount(password, mode)
      navigate(paths.logowanie, { replace: true })
    } catch (e) {
      const code = e instanceof AuthError ? e.code : 'unknown'
      setError(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password'
          ? 'Nieprawidłowe hasło.'
          : authErrorMessage(code).message,
      )
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Header
        back={{ to: paths.ustawienia, label: 'USTAWIENIA' }}
        title={
          <>
            Usuń <Accent>konto</Accent>
          </>
        }
      />

      {owner && others.length > 0 && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
          <span style={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: 500 }}>
            Co z domem „{name}”?
          </span>
          <Segmented
            label="Co z domem"
            size="full"
            value={choice}
            onChange={setChoice}
            options={[
              { id: 'transfer', name: 'Przekaż dom' },
              { id: 'delete-house', name: 'Usuń u wszystkich' },
            ]}
          />
          {choice === 'transfer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '1.4px',
                  color: colors.muted,
                }}
              >
                NOWY ZAŁOŻYCIEL
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {others.map((m) => (
                  <Chip key={m.uid} on={to === m.uid} onClick={() => setTo(m.uid)}>
                    {m.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <Card style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 16 }}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: colors.green900 }}>
          {summary}
        </p>
        <Field
          id="haslo-usun"
          label="HASŁO – DLA POTWIERDZENIA"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
        />
        <button
          type="button"
          disabled={!password || busy || (mode.kind === 'transfer' && !newOwner)}
          onClick={() => setConfirming(true)}
          style={{
            height: 52,
            border: 0,
            borderRadius: 26,
            background: priorities.high.line,
            color: colors.white,
            fontSize: 16,
            fontWeight: 800,
            opacity: !password || busy ? 0.5 : 1,
          }}
        >
          {busy ? 'Usuwam…' : 'Usuń konto na zawsze'}
        </button>
      </Card>

      {confirming && (
        <ConfirmDialog
          title="Usunąć konto?"
          message={summary}
          confirmLabel="Usuń konto"
          danger
          onCancel={() => setConfirming(false)}
          onConfirm={remove}
        />
      )}

      <TabBar active="ustawienia" />
    </Screen>
  )
}
