import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { paths } from '../../app/screens.ts'
import { Accent, Header } from '../../components/Header.tsx'
import { PlusIcon } from '../../components/icons.tsx'
import { TabBar } from '../../components/TabBar.tsx'
import { Card, ConfirmDialog, Screen, SectionLabel, Sheet } from '../../components/ui.tsx'
import { useStore } from '../../data/store.ts'
import type { Member } from '../../data/types.ts'
import { useHouse } from '../../house/house.ts'
import { colors, fonts, priorities } from '../../theme'

/**
 * 5a Domownicy (z Synchronizacja.dc.html bez części o synchronizacji – Firebase synchronizuje sam,
 * decyzja Hani 2026-10-18): lista domowników i „Zaproś domownika”; gdy nikogo – „Na razie tylko Ty”
 * (teksty #4–6). Podgląd pustego domu: `?stan=sam`. Dotknięcie domownika – arkusz („Usuń z domu”
 * tylko dla założyciela); „Opuść dom” – każdy oprócz założyciela (decyzje Hani 2026-10-25).
 */
export function MembersScreen() {
  const { members, currentUid, houseName } = useStore()
  const house = useHouse()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const others = params.get('stan') === 'sam' ? [] : members.filter((m) => m.uid !== currentUid)
  const me = members.find((m) => m.uid === currentUid)
  const owner = members.find((m) => m.role === 'owner')
  const iAmOwner = me?.role === 'owner'
  const [openUid, setOpenUid] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
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
            DOMOWNICY
          </span>
        }
        title={
          <>
            Wspólny <Accent>dom</Accent>
          </>
        }
        aside={
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.onDarkMuted3 }}>
            z bliskimi
          </span>
        }
      />

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
