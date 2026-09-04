import { useMemo, useState } from 'react';
import { statusMeta } from '../constants.js';
import { StatusBadge } from './Bits.jsx';

const WIDTH = 1100;
const HEIGHT = 720;
const CX = WIDTH / 2;
const CY = HEIGHT / 2 + 20;

function pointOnCircle(center, radius, angle) {
  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
  };
}

function truncate(text, len = 18) {
  if (!text) return '';
  return text.length > len ? `${text.slice(0, len)}…` : text;
}

export default function MindMap({ goals, categories, onOpenGoal, onEditGoal }) {
  const [hoveredGoal, setHoveredGoal] = useState(null);

  const layout = useMemo(() => {
    const usedCategories = categories.filter((c) => goals.some((g) => g.category_id === c.id));
    const uncategorized = goals.filter((g) => !g.category_id);
    const groups = usedCategories.map((c) => ({
      category: c,
      goals: goals.filter((g) => g.category_id === c.id),
    }));
    if (uncategorized.length || usedCategories.length === 0) {
      groups.push({
        category: { id: 'none', name: 'Без категория', color: '#94a3b8', icon: '🗂' },
        goals: uncategorized.length ? uncategorized : goals,
      });
    }

    const catRadius = groups.length <= 4 ? 240 : groups.length <= 7 ? 270 : 300;
    const angleStep = (Math.PI * 2) / groups.length;
    const nodes = [];

    groups.forEach((group, gi) => {
      const center = {
        x: CX + catRadius * Math.cos(gi * angleStep - Math.PI / 2),
        y: CY + catRadius * Math.sin(gi * angleStep - Math.PI / 2),
      };
      const catNode = {
        id: `cat-${group.category.id}`,
        kind: 'category',
        category: group.category,
        x: center.x,
        y: center.y,
        r: group.category.id === 'none' ? 42 : 44,
      };
      nodes.push(catNode);

      const n = group.goals.length;
      const goalRadius = Math.max(110, Math.min(170, 120 + n * 6));
      const step = n === 1 ? 0 : (Math.PI * 1.7) / Math.max(1, n - 1);
      const start = -Math.PI / 2 - ((n - 1) * step) / 2;

      group.goals.forEach((goal, gi2) => {
        const p = pointOnCircle(center, goalRadius, start + gi2 * step);
        const goalNode = {
          id: `goal-${goal.id}`,
          kind: 'goal',
          goal,
          x: p.x,
          y: p.y,
          r: 36,
          color: group.category.color,
        };
        nodes.push(goalNode);
      });
    });

    return { nodes, groups };
  }, [goals, categories]);

  const nodeById = Object.fromEntries(layout.nodes.map((n) => [n.id, n]));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Карта на целите</h1>
          <p className="muted">
            Визуална карта — категориите са в центъра на всеки клон, а целите около тях. Кликнете върху цел, за да я отворите.
          </p>
        </div>
      </div>

      <div className="legend">
        {layout.groups.map((g) => (
          <span key={g.category.id} className="legend-item">
            <span className="legend-dot" style={{ background: g.category.color }} />
            {g.category.icon} {g.category.name}
          </span>
        ))}
      </div>

      <div className="mindmap-wrap">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mindmap" role="img" aria-label="Карта на целите">
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#cbd5e1" />
            </marker>
          </defs>

          {/* center node */}
          <circle cx={CX} cy={CY} r={58} fill="#1e293b" />
          <text x={CX} y={CY - 4} textAnchor="middle" fontSize="22" fill="#fff" fontWeight="700">
            🎯
          </text>
          <text x={CX} y={CY + 20} textAnchor="middle" fontSize="12" fill="#e2e8f0">
            МОИТЕ ЦЕЛИ
          </text>

          {layout.nodes.map((node) => {
            if (node.kind === 'category') {
              return (
                <g key={node.id}>
                  <line
                    x1={CX}
                    y1={CY}
                    x2={node.x}
                    y2={node.y}
                    stroke={node.category.color}
                    strokeWidth={3}
                    opacity={0.55}
                    markerEnd="url(#arrow)"
                  />
                  <circle cx={node.x} cy={node.y} r={node.r} fill={`${node.category.color}22`} stroke={node.category.color} strokeWidth={2.5} />
                  <text x={node.x} y={node.y - 8} textAnchor="middle" fontSize="26">
                    {node.category.icon}
                  </text>
                  <text x={node.x} y={node.y + 20} textAnchor="middle" fontSize="13" fontWeight="700" fill="#334155">
                    {truncate(node.category.name, 15)}
                  </text>
                </g>
              );
            }
            return null;
          })}

          {layout.nodes
            .filter((n) => n.kind === 'goal')
            .map((node) => {
              const goal = node.goal;
              const meta = statusMeta(goal.status);
              const isHover = hoveredGoal === goal.id;
              return (
                <g
                  key={node.id}
                  className="mm-goal"
                  onClick={() => onOpenGoal(goal)}
                  onMouseEnter={() => setHoveredGoal(goal.id)}
                  onMouseLeave={() => setHoveredGoal(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.r + (isHover ? 4 : 0)}
                    fill="#ffffff"
                    stroke={node.color}
                    strokeWidth={isHover ? 3 : 2}
                    opacity={0.96}
                  />
                  <circle cx={node.x} cy={node.y} r={8} fill={node.color} />
                  <rect x={node.x - node.r} y={node.y + node.r - 8} width={node.r * 2} height={16} rx={8} fill="#f8fafc" stroke="#e2e8f0" />
                  <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="12" fontWeight="600" fill="#334155">
                    {truncate(goal.title, 15)}
                  </text>
                  <text x={node.x} y={node.y + 20} textAnchor="middle" fontSize="9" fill={meta.color}>
                    {meta.label}
                  </text>
                  {goal.progress >= 100 && (
                    <text x={node.x + node.r - 6} y={node.y - node.r + 12} fontSize="12">
                      ✅
                    </text>
                  )}
                </g>
              );
            })}
        </svg>

        {hoveredGoal && (
          <div className="mindmap-tooltip">
            <strong>{hoveredGoal.title}</strong>
            <div className="mindmap-tooltip-meta">
              <StatusBadge status={hoveredGoal.status} size="sm" />
              <span>Напредък: {hoveredGoal.progress}%</span>
            </div>
            <button className="btn ghost tiny" onClick={() => onEditGoal(hoveredGoal)}>
              Редактирай
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
