import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { paths } from '../../app/screens.ts'
import { Accent, Header } from '../../components/Header.tsx'
import { HouseIcon, PlusIcon } from '../../components/icons.tsx'
import { TabBar } from '../../components/TabBar.tsx'
import { Card, ConfirmDialog, Screen, SectionLabel, Sheet } from '../../components/ui.tsx'
import { useStore } from '../../data/store.ts'
import type { Member } from '../../data/types.ts'
import { DEFAULT_HOUSE_NAME, useHouse } from '../../house/house.ts'
import { colors, fonts, priorities } from '../../theme'

/**
 * 5a Wspólny dom (dawniej „Domownicy”; wariant A, decyzja Hani 2026-11-20): wszystko o domu w jednym
 * miejscu – nazwa domu („Zmień”), Twój nick („Zmień nick”), domownicy i „Zaproś domownika”; gdy
 * nikogo – „Na razie tylko Ty” (teksty #4–6). Podgląd pustego domu: `?stan=sam`. Dotknięcie
 * domownika – arkusz („Usuń z domu” tylko dla założyciela); „Opuść dom” – każdy oprócz założyciela
 * (decyzje Hani 2026-10-25).
 */
export function MembersScreen() {
  const { members, currentUid, houseName, userName, setUserName, setHouseName } = useStore()
  const house = useHouse()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const others = params.get('stan') === 'sam' ? [] : members.filter((m) => m.uid !== currentUid)
  const me = members.find((m) => m.uid === currentUid)
  const owner = members.find((m) => m.role === 'owner')
  const iAmOwner = me?.role === 'owner'
  const [openUid, setOpenUid] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [editing, setEditing] = useState<'house' | 'nick' | null>(null)
  // „Dom na Leśnej” → „Dom na ” + wyróżnione „Leśnej”
  const words = houseName.trim().split(/\s+/)
  const lastWord = words.length > 1 ? words.pop() : ''
  const opened = others.find((m) => m.uid === openUid)

  return (
    <Screen>
      <Header
        back={{ to: paths.ustawienia, label: 'USTAWIENIA' }}
        topRight={
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '1.2px',
              color: colors.onDarkMuted2,
            }}
          >
            WSPÓLNY DOM
          </span>
        }
        title={
          lastWord ? (
            <>
              {words.join(' ')} <Accent>{lastWord}</Accent>
            </>
          ) : (
            <Accent>{houseName}</Accent>
          )
        }
      />

      <Card
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 8px 14px 16px' }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 36,
            height: 36,
            flex: 'none',
            borderRadius: 12,
            background: colors.sand,
            color: colors.brass700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <HouseIcon size={20} />
        </span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', color: colors.muted }}
          >
            NAZWA DOMU
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, overflowWrap: 'anywhere' }}>
            {houseName}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setEditing('house')}
          aria-label="Zmień nazwę domu"
          style={changeButton}
        >
          Zmień
        </button>
      </Card>

      {others.length === 0 && (
        <Card
          radius={26}
          style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 20 }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '1.6px',
              color: colors.brass700,
            }}
          >
            TYLKO TY
          </span>
          <span style={{ fontFamily: fonts.serif, fontSize: 24, fontWeight: 500 }}>
            Na razie <em>tylko Ty</em>
          </span>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: colors.muted2 }}>
            Zadania i kalendarz są zapisane na Twoim koncie. Zaproś domownika, żeby mieć wspólny dom
            z bliskimi.
          </p>
        </Card>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionLabel>DOMOWNICY</SectionLabel>
        <Card radius={22}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 8px 12px 18px',
              minHeight: 64,
              borderBottom: `1px solid ${colors.line}`,
            }}
          >
            <Avatar name={userName} />
            <span
              style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}
            >
              <span style={{ fontSize: 16, fontWeight: 700 }}>
                {userName || 'Ty'}{' '}
                <span style={{ fontWeight: 600, color: colors.muted }}>(Ty)</span>
              </span>
              <span
                style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', color: colors.muted }}
              >
                {me?.role === 'owner' ? 'ZAŁOŻYCIEL DOMU' : 'DOMOWNIK'}
              </span>
            </span>
            <button type="button" onClick={() => setEditing('nick')} style={changeButton}>
              Zmień nick
            </button>
          </div>
          {others.map((m) => (
            <button
              key={m.uid}
              type="button"
              onClick={() => setOpenUid(m.uid)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '12px 18px',
                minHeight: 64,
                border: 0,
                borderBottom: `1px solid ${colors.line}`,
                background: 'transparent',
                color: colors.green900,
                textAlign: 'left',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: colors.green900,
                  color: colors.brass300,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: fonts.serif,
                  fontStyle: 'italic',
                  fontSize: 18,
                  flex: 'none',
                }}
              >
                {m.name.charAt(0)}
              </span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{m.name}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '1px',
                    color: colors.muted,
                  }}
                >
                  {m.role === 'owner' ? 'ZAŁOŻYCIEL DOMU' : 'DOMOWNIK'}
                </span>
              </span>
              <span style={{ fontFamily: fonts.serif, fontSize: 14, color: colors.brass700 }}>
                {m.lastSeen.replace(/^DZIŚ /, '')}
              </span>
            </button>
          ))}
          <Link
            to={paths.zapros}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 18px',
              height: 58,
              color: colors.brass700,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '1px',
              textDecoration: 'none',
            }}
          >
            <PlusIcon size={20} strokeWidth={2.2} />
            ZAPROŚ DOMOWNIKA
          </Link>
        </Card>
      </section>

      {me && !iAmOwner && (
        <button
          type="button"
          onClick={() => setLeaving(true)}
          style={{
            alignSelf: 'center',
            height: 44,
            padding: '0 16px',
            border: 0,
            background: 'transparent',
            color: priorities.high.line,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '1.2px',
          }}
        >
          OPUŚĆ DOM
        </button>
      )}

      {opened && (
        <MemberSheet
          member={opened}
          canRemove={iAmOwner}
          ownerName={owner?.name ?? ''}
          onRemove={() => {
            setOpenUid(null)
            house.removeMember(opened.uid).catch(() => {})
          }}
          onClose={() => setOpenUid(null)}
        />
      )}

      {editing === 'house' && (
        <EditTextSheet
          id="nazwa-domu"
          title="Nazwa domu"
          initial={houseName}
          maxLength={40}
          placeholder={DEFAULT_HOUSE_NAME}
          hint={() => 'Widzą ją wszyscy domownicy i nowi przy dołączaniu.'}
          onSave={setHouseName}
          onClose={() => setEditing(null)}
        />
      )}
      {editing === 'nick' && (
        <EditTextSheet
          id="nick"
          title="Twój nick"
          initial={userName}
          maxLength={20}
          placeholder="np. Hania, Mama, Szefowa"
          hint={(v) => (
            <>
              Start przywita Cię:{' '}
              <em style={{ fontFamily: fonts.serif, color: colors.brass700 }}>
                „Dzień dobry, {v || 'Ty'}”
              </em>
              . Domownicy zobaczą ten nick przy Twoich zmianach.
            </>
          )}
          onSave={setUserName}
          onClose={() => setEditing(null)}
        />
      )}

      {leaving && (
        <ConfirmDialog
          title="Opuścić dom?"
          message={`Stracisz dostęp do wspólnych zadań i kalendarza „${houseName}”. Wrócić możesz tylko z nowym zaproszeniem.`}
          confirmLabel="Opuść dom"
          danger
          onCancel={() => setLeaving(false)}
          onConfirm={async () => {
            setLeaving(false)
            await house.leaveHouse()
            navigate(paths.pierwsze, { replace: true })
          }}
        />
      )}

      <TabBar active="ustawienia" />
    </Screen>
  )
}

/** Arkusz domownika: imię, rola; „Usuń z domu” – tylko założyciel (z pytaniem). */
function MemberSheet({
  member,
  canRemove,
  ownerName,
  onRemove,
  onClose,
}: {
  member: Member
  canRemove: boolean
  ownerName: string
  onRemove: () => void
  onClose: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  return (
    <Sheet open onClose={onClose} label="Domownik">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span
          aria-hidden="true"
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background: colors.green900,
            color: colors.brass300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: fonts.serif,
            fontStyle: 'italic',
            fontSize: 24,
            flex: 'none',
          }}
        >
          {member.name.charAt(0)}
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontFamily: fonts.serif, fontSize: 26, fontWeight: 500 }}>
            {member.name}
          </span>
          <span
            style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', color: colors.muted }}
          >
            {member.role === 'owner' ? 'ZAŁOŻYCIEL DOMU' : 'DOMOWNIK'}
          </span>
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: colors.muted2 }}>
        Widzi wszystkie wspólne zadania i wydarzenia. To, co oznaczysz „Tylko ja”, zostaje dla
        Ciebie.
      </p>
      {canRemove && member.role !== 'owner' ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          style={{
            height: 48,
            border: `1px solid ${priorities.high.line}`,
            borderRadius: 24,
            background: colors.white,
            color: priorities.high.line,
            fontSize: 15,
            fontWeight: 800,
          }}
        >
          Usuń z domu
        </button>
      ) : (
        member.role !== 'owner' && (
          <span style={{ fontSize: 13, lineHeight: 1.45, color: colors.muted }}>
            Usuwać domowników może tylko założyciel domu{ownerName ? ` (${ownerName})` : ''}.
          </span>
        )
      )}
      {confirming && (
        <ConfirmDialog
          title="Usunąć z domu?"
          message={`${member.name} straci dostęp do wspólnych zadań i kalendarza. Wspólne zadania i wydarzenia dodane przez tę osobę zostają.`}
          confirmLabel="Usuń z domu"
          danger
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false)
            onRemove()
          }}
        />
      )}
    </Sheet>
  )
}

const changeButton = {
  height: 44,
  padding: '0 10px',
  flex: 'none',
  border: 0,
  background: 'transparent',
  color: colors.brass700,
  fontSize: 14,
  fontWeight: 800,
} as const

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        background: colors.green900,
        color: colors.brass300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fonts.serif,
        fontStyle: 'italic',
        fontSize: 18,
        flex: 'none',
      }}
    >
      {name.charAt(0).toUpperCase() || '?'}
    </span>
  )
}

/**
 * Arkusz z jednym polem (nazwa domu, nick): „Zapisz” / „Anuluj”; dotknięcie obok zwija, a gdy coś
 * zmieniono – najpierw „Odrzucić zmiany?”. Pustego nie da się zapisać.
 */
function EditTextSheet({
  id,
  title,
  initial,
  maxLength,
  placeholder,
  hint,
  onSave,
  onClose,
}: {
  id: string
  title: string
  initial: string
  maxLength: number
  placeholder: string
  hint: (value: string) => ReactNode
  onSave: (value: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(initial)
  const [asking, setAsking] = useState(false)
  const text = value.trim()
  const dirty = text !== initial.trim()
  const save = () => {
    if (!text) return
    if (dirty) onSave(text)
    onClose()
  }
  return (
    <Sheet
      open
      onClose={() => (dirty ? setAsking(true) : onClose())}
      confirmClose={dirty}
      label={title}
    >
      <label htmlFor={id} style={{ fontFamily: fonts.serif, fontSize: 24, fontWeight: 500 }}>
        {title}
      </label>
      <input
        id={id}
        type="text"
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        style={{
          height: 48,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: '0 14px',
          fontSize: 16,
          fontWeight: 700,
          color: colors.green900,
          background: colors.white,
          outlineColor: colors.green900,
          minWidth: 0,
        }}
      />
      <span style={{ fontSize: 13, lineHeight: 1.45, color: colors.muted }}>{hint(text)}</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={() => (dirty ? setAsking(true) : onClose())}
          style={{
            height: 52,
            border: `1px solid ${colors.border}`,
            borderRadius: 26,
            background: colors.white,
            color: colors.green900,
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          Anuluj
        </button>
        <button
          type="button"
          disabled={!text}
          onClick={save}
          style={{
            height: 52,
            border: 0,
            borderRadius: 26,
            background: colors.green900,
            color: colors.cream,
            fontSize: 16,
            fontWeight: 800,
            opacity: text ? 1 : 0.5,
          }}
        >
          Zapisz
        </button>
      </div>
      {asking && (
        <ConfirmDialog
          title="Odrzucić zmiany?"
          message="Zmiany nie zostaną zapisane."
          confirmLabel="Odrzuć"
          danger
          onCancel={() => setAsking(false)}
          onConfirm={onClose}
        />
      )}
    </Sheet>
  )
}
