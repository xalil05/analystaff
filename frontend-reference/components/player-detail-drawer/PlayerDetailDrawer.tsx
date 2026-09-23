'use client';

/**
 * PlayerDetailDrawer — Analystaff
 * 
 * Fiche joueur mobile-first, alignée sur DECISIONS_FIGEES.md :
 * - §8  Profil structuré par sections avec permissions RBAC
 * - §4  Traçabilité contexte de saisie
 * - §14 Snapshot de pondération (pas de recalcul rétroactif)
 * - §11 Boutons IA métier (zéro prompt libre)
 * - §3  Export PDF V0
 * - §26 Multi-support (mobile-first)
 */

import { useState } from 'react';
import type {
  PlayerDetailDrawerProps,
  PlayerIdentity,
  PlayerPhysical,
  MatchEvaluation,
  MedicalRecord,
  ChargeJour,
  PillarNote,
  Pilier,
  PermissionCode,
  IaActionKey,
  WeightingSnapshot,
} from './types';

// ─── Constantes ──────────────────────────────────────────────────────────────

const PILLAR_COLORS: Record<Pilier, string> = {
  physique: '#E53935',
  technique: '#1E88E5',
  tactique: '#8E24AA',
  mental: '#F59E0B',
};

const PILLAR_LABELS: Record<Pilier, string> = {
  physique: 'Physique',
  technique: 'Technique',
  tactique: 'Tactique',
  mental: 'Mental',
};

const CONTEXTE_LABELS: Record<string, string> = {
  direct_stade: 'saisie au stade',
  apres_match: 'saisie après match',
  avant_entrainement: 'saisie avant entraînement',
  apres_entrainement: 'saisie après entraînement',
  planification: 'planification',
  autre: 'autre',
};

const IA_ACTIONS: { key: IaActionKey; label: string; icon: string }[] = [
  { key: 'ANALYSER_FATIGUE', label: 'Analyser la fatigue', icon: '🔍' },
  { key: 'SUGGERER_COMPOSITION', label: 'Suggérer composition', icon: '📋' },
  { key: 'EVOLUTION_FORME', label: 'Évolution de forme', icon: '📈' },
  { key: 'EVALUER_RISQUE_BLESSURE', label: 'Évaluer risque blessure', icon: '🏥' },
];

// ─── Utilitaires permissions ─────────────────────────────────────────────────

function canSeeMedical(perms: PermissionCode[]): boolean {
  return perms.includes('VOIR_DONNEES_MEDICALES');
}

function canSeePhysical(perms: PermissionCode[]): boolean {
  return perms.includes('VOIR_DONNEES_PHYSIQUES');
}

// ─── Composant: Badge de statut ──────────────────────────────────────────────

function StatusBadge({ statut }: { statut: PlayerIdentity['statut'] }) {
  const config = {
    actif: { bg: '#D1FAE5', text: '#059669', label: 'Actif' },
    blesse: { bg: '#FEE2E2', text: '#DC2626', label: 'Blessé' },
    suspendu: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Suspendu' },
    parti: { bg: '#F1F5F9', text: '#64748B', label: 'Parti' },
    archive: { bg: '#F1F5F9', text: '#64748B', label: 'Archivé' },
  }[statut];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: config.bg,
        color: config.text,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: config.text,
        }}
      />
      {config.label}
    </span>
  );
}

// ─── Composant: Charge badge (rouge/ambre/vert) ──────────────────────────────

function ChargeBadge({ charge }: { charge: number }) {
  const color = charge > 85 ? '#DC2626' : charge > 70 ? '#F59E0B' : '#10B981';
  const label = charge > 85 ? 'Élevée' : charge > 70 ? 'Modérée' : 'Faible';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: `${color}1F`,
        color: color,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}

// ─── Composant: Radar SVG 4 piliers ─────────────────────────────────────────

function RadarChart({
  pillars,
  clubMoyenne,
}: {
  pillars: PillarNote[];
  clubMoyenne: PillarNote[] | null;
}) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 60;
  const levels = 4;

  const angleForIndex = (i: number) => (Math.PI * 2 * i) / 4 - Math.PI / 2;
  const pointAt = (i: number, r: number) => ({
    x: cx + r * Math.cos(angleForIndex(i)),
    y: cy + r * Math.sin(angleForIndex(i)),
  });

  const pillarMap = new Map(pillars.map((p) => [p.pilier, p.note]));
  const clubMap = new Map(clubMoyenne?.map((p) => [p.pilier, p.note]) || []);

  const playerPoints = ([['physique', 0], ['technique', 1], ['tactique', 2], ['mental', 3]] as const).map(
    ([pilier, i]) => {
      const val = pillarMap.get(pilier) ?? 0;
      return pointAt(i, (val / 10) * maxR);
    }
  );

  const clubPoints = ([['physique', 0], ['technique', 1], ['tactique', 2], ['mental', 3]] as const).map(
    ([pilier, i]) => {
      const val = clubMap.get(pilier) ?? 0;
      return pointAt(i, (val / 10) * maxR);
    }
  );

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grille */}
      {Array.from({ length: levels }).map((_, l) => {
        const r = (maxR * (l + 1)) / levels;
        const pts = [0, 1, 2, 3].map((i) => pointAt(i, r));
        return (
          <polygon
            key={l}
            points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={1}
          />
        );
      })}

      {/* Axes */}
      {[0, 1, 2, 3].map((i) => {
        const end = pointAt(i, maxR);
        return (
          <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#E2E8F0" strokeWidth={1} />
        );
      })}

      {/* Club moyenne (pointillés) */}
      <polygon
        points={clubPoints.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="#94A3B8"
        strokeWidth={1}
        strokeDasharray="4,3"
        opacity={0.7}
      />

      {/* Joueur */}
      <polygon
        points={playerPoints.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="rgba(16, 185, 129, 0.15)"
        stroke="#10B981"
        strokeWidth={2}
      />

      {/* Points joueur */}
      {playerPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#10B981" />
      ))}

      {/* Labels */}
      {([['physique', 0], ['technique', 1], ['tactique', 2], ['mental', 3]] as const).map(
        ([pilier, i]) => {
          const p = pointAt(i, maxR + 18);
          return (
            <text
              key={pilier}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={8}
              fontWeight={600}
              fill={PILLAR_COLORS[pilier]}
              fontFamily="Inter, system-ui, sans-serif"
            >
              {PILLAR_LABELS[pilier].toUpperCase()}
            </text>
          );
        }
      )}
    </svg>
  );
}

// ─── Composant: Snapshot de pondération (tooltip) ────────────────────────────

function NoteGlobaleWithSnapshot({
  note,
  snapshot,
}: {
  note: number | null;
  snapshot: WeightingSnapshot | null;
}) {
  const [showSnapshot, setShowSnapshot] = useState(false);

  if (note === null) return null;

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShowSnapshot(true)}
      onMouseLeave={() => setShowSnapshot(false)}
    >
      <span
        style={{
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontSize: 28,
          fontWeight: 700,
          color: '#1E293B',
          cursor: 'help',
          borderBottom: '2px dotted #94A3B8',
        }}
      >
        {note.toFixed(1)}
      </span>

      {showSnapshot && snapshot && (
        <div
          style={{
            position: 'absolute',
            bottom: '110%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1E293B',
            color: '#F8FAFC',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 11,
            whiteSpace: 'nowrap',
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#94A3B8' }}>
            Pondération utilisée
          </div>
          <div>Physique {(snapshot.poidsPhysique * 100).toFixed(0)}%</div>
          <div>Technique {(snapshot.poidsTechnique * 100).toFixed(0)}%</div>
          <div>Tactique {(snapshot.poidsTactique * 100).toFixed(0)}%</div>
          <div>Mental {(snapshot.poidsMental * 100).toFixed(0)}%</div>
        </div>
      )}
    </div>
  );
}

// ─── Composant: Indicateur contexte de saisie ────────────────────────────────

function ContexteSaisieBadge({
  contexte,
  horsLigne,
  synchronisee,
  dateReelle,
}: {
  contexte: MatchEvaluation['contexteSaisie'];
  horsLigne: boolean;
  synchronisee: boolean;
  dateReelle: string;
}) {
  const label = CONTEXTE_LABELS[contexte] ?? contexte;
  const date = new Date(dateReelle);
  const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  let text = `${label} · ${dateStr} ${timeStr}`;
  if (horsLigne && synchronisee) {
    text = `${label} · synchronisée le ${dateStr}`;
  } else if (horsLigne) {
    text = `${label} · hors ligne`;
  }

  return (
    <span
      style={{
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: 500,
      }}
    >
      {text}
    </span>
  );
}

// ─── Composant: Barres de charge 7 jours ─────────────────────────────────────

function ChargeBarChart({ data }: { data: ChargeJour[] }) {
  const maxVal = Math.max(...data.map((d) => d.valeur), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100, paddingTop: 8 }}>
      {data.map((d) => {
        const heightPct = (d.valeur / maxVal) * 100;
        const color = d.valeur > 85 ? '#DC2626' : d.valeur > 70 ? '#F59E0B' : '#10B981';
        return (
          <div
            key={d.jour}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              height: '100%',
              justifyContent: 'flex-end',
            }}
          >
            <span style={{ fontSize: 9, color: '#64748B', fontWeight: 600 }}>{d.valeur}</span>
            <div
              style={{
                width: '100%',
                maxWidth: 28,
                height: `${heightPct}%`,
                borderRadius: '6px 6px 2px 2px',
                background: color,
                minHeight: 4,
              }}
            />
            <span style={{ fontSize: 9, fontWeight: 600, color: '#64748B' }}>{d.jour}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function PlayerDetailDrawer({
  player,
  physical,
  evaluations,
  medicalRecords,
  charge7Jours,
  clubMoyenne,
  userPermissions,
  onClose,
  onExportPdf,
  onEvaluer,
  onIaAction,
}: PlayerDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const showMedical = canSeeMedical(userPermissions);
  const showPhysical = canSeePhysical(userPermissions);

  // Calcul des piliers actuels (dernière évaluation)
  const latestEval = evaluations[0] ?? null;
  const currentPillars: PillarNote[] = latestEval?.pillars ?? [
    { pilier: 'physique', note: 0 },
    { pilier: 'technique', note: 0 },
    { pilier: 'tactique', note: 0 },
    { pilier: 'mental', note: 0 },
  ];

  const tabs = [
    { id: 'overview', label: "Vue d'ensemble", always: true },
    { id: 'medical', label: 'Médical', always: false, show: showMedical },
    { id: 'physical', label: 'Physique', always: false, show: showPhysical },
  ].filter((t) => t.always || t.show);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(15, 23, 42, 0.4)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          height: '100vh',
          background: '#F8FAFC',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 0.2s ease-out',
        }}
      >
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Avatar */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #10B981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {player.prenom?.[0] ?? ''}
              {player.nom[0]}
            </div>

            {/* Identité */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#1E293B',
                  letterSpacing: '-0.02em',
                }}
              >
                {player.prenom} {player.nom}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                {player.numero && `N°${player.numero} · `}
                {player.poste}
                {player.dateNaissance &&
                  ` · ${Math.floor(
                    (Date.now() - new Date(player.dateNaissance).getTime()) /
                      (365.25 * 24 * 60 * 60 * 1000)
                  )} ans`}
                {physical?.tailleCm && ` · ${physical.tailleCm}cm`}
                {physical?.poidsKg && ` · ${physical.poidsKg}kg`}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <StatusBadge statut={player.statut} />
                {physical && physical.chargeTravail > 0 && (
                  <ChargeBadge charge={physical.chargeTravail} />
                )}
              </div>
            </div>

            {/* Boutons action */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={onExportPdf}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                📄 PDF
              </button>
              <button
                onClick={onEvaluer}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#10B981',
                  color: '#FFFFFF',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                ✏️ Évaluer
              </button>
            </div>
          </div>
        </div>

        {/* ── Onglets ────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            padding: '0 24px',
            borderBottom: '1px solid #E2E8F0',
            background: '#FFFFFF',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                fontSize: 12.5,
                fontWeight: 600,
                color: activeTab === tab.id ? '#1E293B' : '#64748B',
                borderBottom: activeTab === tab.id ? '2px solid #10B981' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Contenu ────────────────────────────────────────────── */}
        <div style={{ flex: 1, padding: '20px 24px' }}>
          {/* Vue d'ensemble */}
          {activeTab === 'overview' && (
            <div>
              {/* Radar + Note globale */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <RadarChart pillars={currentPillars} clubMoyenne={clubMoyenne} />
                  <div style={{ flex: 1 }}>
                    {currentPillars.map((p) => (
                      <div
                        key={p.pilier}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: PILLAR_COLORS[p.pilier],
                          }}
                        />
                        <span style={{ fontSize: 12, flex: 1 }}>{PILLAR_LABELS[p.pilier]}</span>
                        <span
                          style={{
                            fontFamily: "'Space Grotesk', system-ui, sans-serif",
                            fontWeight: 700,
                            fontSize: 13,
                            color: PILLAR_COLORS[p.pilier],
                          }}
                        >
                          {p.note.toFixed(1)}
                        </span>
                      </div>
                    ))}
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: '1px solid #E2E8F0',
                        textAlign: 'center',
                      }}
                    >
                      <NoteGlobaleWithSnapshot
                        note={latestEval?.noteGlobale ?? null}
                        snapshot={latestEval?.snapshot ?? null}
                      />
                      <div
                        style={{
                          fontSize: 10,
                          color: '#94A3B8',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginTop: 2,
                        }}
                      >
                        Note globale
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5 derniers matchs */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Grotesk', system-ui, sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1E293B',
                    marginBottom: 12,
                  }}
                >
                  5 derniers matchs
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {['Date', 'Adversaire', 'Min', 'B', 'P', 'Note'].map((h) => (
                          <th
                            key={h}
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              color: '#64748B',
                              textAlign: 'left',
                              padding: '6px 8px',
                              borderBottom: '1px solid #E2E8F0',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {evaluations.slice(0, 5).map((ev, i) => (
                        <tr key={i}>
                          <td style={{ padding: '8px', color: '#64748B' }}>
                            {new Date(ev.dateMatch).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </td>
                          <td style={{ padding: '8px', fontWeight: 600, color: '#1E293B' }}>
                            {ev.adversaire}
                          </td>
                          <td style={{ padding: '8px' }}>{ev.minutes}&apos;</td>
                          <td style={{ padding: '8px' }}>{ev.buts}</td>
                          <td style={{ padding: '8px' }}>{ev.passes}</td>
                          <td style={{ padding: '8px', position: 'relative' }}>
                            <span
                              style={{
                                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                                fontWeight: 700,
                                color: '#1E293B',
                              }}
                            >
                              {ev.noteGlobale?.toFixed(1) ?? '—'}
                            </span>
                            <div>
                              <ContexteSaisieBadge
                                contexte={ev.contexteSaisie}
                                horsLigne={ev.saisieHorsLigne}
                                synchronisee={ev.synchronisee}
                                dateReelle={ev.dateSaisieReelle}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Boutons IA métier */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Grotesk', system-ui, sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1E293B',
                    marginBottom: 12,
                  }}
                >
                  🤖 Assistant IA
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {IA_ACTIONS.map((action) => (
                    <button
                      key={action.key}
                      onClick={() => onIaAction(action.key)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: '1px solid #1E3A5F',
                        background: '#1E3A5F',
                        color: '#FFFFFF',
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s',
                      }}
                    >
                      <span>{action.icon}</span>
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Onglet Médical (RBAC: VOIR_DONNEES_MEDICALES) */}
          {activeTab === 'medical' && showMedical && (
            <div>
              <div
                style={{
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: '#64748B',
                  marginBottom: 10,
                }}
              >
                Dossier médical
              </div>
              {medicalRecords.length === 0 ? (
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: 24,
                    textAlign: 'center',
                    color: '#94A3B8',
                    fontSize: 12,
                  }}
                >
                  Aucun enregistrement médical
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {['Type', 'Description', 'Début', 'Fin', 'Statut'].map((h) => (
                          <th
                            key={h}
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              color: '#64748B',
                              textAlign: 'left',
                              padding: '8px 10px',
                              borderBottom: '1px solid #E2E8F0',
                              background: '#F1F5F9',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {medicalRecords.map((rec) => (
                        <tr key={rec.id}>
                          <td style={{ padding: '8px 10px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 999,
                                fontSize: 10,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                background:
                                  rec.type === 'blessure'
                                    ? '#FEE2E2'
                                    : rec.type === 'contre_indication'
                                    ? '#FEF3C7'
                                    : '#DBEAFE',
                                color:
                                  rec.type === 'blessure'
                                    ? '#DC2626'
                                    : rec.type === 'contre_indication'
                                    ? '#B45309'
                                    : '#1D4ED8',
                              }}
                            >
                              {rec.type === 'blessure'
                                ? 'Blessure'
                                : rec.type === 'contre_indication'
                                ? 'Contre-indication'
                                : rec.type === 'antecedent'
                                ? 'Antécédent'
                                : 'Suivi'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', color: '#334155' }}>
                            {rec.description ?? '—'}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#64748B' }}>
                            {rec.dateDebut ?? '—'}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#64748B' }}>
                            {rec.dateFin ?? '—'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 999,
                                fontSize: 10,
                                fontWeight: 600,
                                background: rec.statut === 'gueri' ? '#D1FAE5' : '#FEF3C7',
                                color: rec.statut === 'gueri' ? '#059669' : '#B45309',
                              }}
                            >
                              {rec.statut}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Onglet Physique (RBAC: VOIR_DONNEES_PHYSIQUES) */}
          {activeTab === 'physical' && showPhysical && (
            <div>
              {/* Données morphologiques */}
              {physical && (
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Space Grotesk', system-ui, sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1E293B',
                      marginBottom: 12,
                    }}
                  >
                    Morphologie
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                      { label: 'Taille', value: physical.tailleCm ? `${physical.tailleCm} cm` : '—' },
                      { label: 'Poids', value: physical.poidsKg ? `${physical.poidsKg} kg` : '—' },
                      { label: 'IMC', value: physical.imc ? physical.imc.toFixed(1) : '—' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          padding: 12,
                          background: '#F8FAFC',
                          borderRadius: 8,
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: '#64748B',
                          }}
                        >
                          {item.label}
                        </div>
                        <div
                          style={{
                            fontFamily: "'Space Grotesk', system-ui, sans-serif",
                            fontSize: 20,
                            fontWeight: 700,
                            color: '#1E293B',
                            marginTop: 4,
                          }}
                        >
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Charge 7 jours */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Grotesk', system-ui, sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1E293B',
                    marginBottom: 12,
                  }}
                >
                  Charge d&apos;entraînement (7 jours)
                </div>
                <ChargeBarChart data={charge7Jours} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
