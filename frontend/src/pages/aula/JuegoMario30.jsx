import React, { useState, useEffect, useRef } from 'react';
import AulaLayout from '../../components/aula/AulaLayout';
import {
  Gamepad2,
  Trophy,
  RotateCcw,
  Sparkles,
  Zap,
  Activity,
  Award,
  ChevronRight,
  Play,
  Pause,
  ArrowRight
} from 'lucide-react';

export default function JuegoMario30() {
  const canvasRef = useRef(null);

  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState('ready'); // 'ready', 'playing', 'level_clear', 'game_over', 'all_clear'

  // Game physics state refs to avoid closure stalls
  const stateRef = useRef({
    player: {
      x: 50,
      y: 280,
      width: 28,
      height: 38,
      vx: 0,
      vy: 0,
      isGrounded: false,
      facing: 'right'
    },
    keys: {
      left: false,
      right: false,
      jump: false
    },
    levelData: null,
    animationId: null,
    level: 1
  });

  // Generate deterministic level configuration for 30 levels
  const generateLevel = (lvl) => {
    const levelLength = 1200 + (lvl * 150);
    const platforms = [
      { x: 0, y: 340, width: levelLength, height: 60, type: 'ground' }
    ];

    const coinsList = [];
    const obstacles = [];

    // Gaps in ground for level > 3
    if (lvl > 3) {
      const numGaps = Math.min(Math.floor(lvl / 3), 6);
      for (let i = 1; i <= numGaps; i++) {
        const gapX = 350 * i + (lvl * 20);
        obstacles.push({ x: gapX, y: 340, width: 60 + Math.min(lvl * 4, 60), height: 70, type: 'gap' });
      }
    }

    // Elevated floating platforms
    const numPlatforms = 4 + Math.floor(lvl * 1.2);
    for (let i = 0; i < numPlatforms; i++) {
      const px = 200 + (i * 180) + ((lvl * 15) % 100);
      const py = 250 - ((i % 3) * 50);
      platforms.push({ x: px, y: py, width: 85, height: 18, type: 'block' });

      // Coin on platform
      coinsList.push({ x: px + 35, y: py - 25, radius: 9, collected: false });
    }

    // Flag / Goal at the end
    const goalX = levelLength - 120;

    return {
      length: levelLength,
      platforms,
      coins: coinsList,
      obstacles,
      goal: { x: goalX, y: 180, width: 20, height: 160 }
    };
  };

  // Keyboard handlers for purely responsive platformer game controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowleft', 'arrowright', 'w', 'a', 'd', ' '].includes(key)) {
        e.preventDefault();
      }

      if (key === 'arrowleft' || key === 'a') stateRef.current.keys.left = true;
      if (key === 'arrowright' || key === 'd') stateRef.current.keys.right = true;
      if (key === 'arrowup' || key === 'w' || key === ' ') {
        stateRef.current.keys.jump = true;
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();

      if (key === 'arrowleft' || key === 'a') stateRef.current.keys.left = false;
      if (key === 'arrowright' || key === 'd') stateRef.current.keys.right = false;
      if (key === 'arrowup' || key === 'w' || key === ' ') {
        stateRef.current.keys.jump = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Start / Init Level
  const initLevel = (lvl) => {
    const levelData = generateLevel(lvl);
    stateRef.current.levelData = levelData;
    stateRef.current.level = lvl;
    stateRef.current.player.x = 60;
    stateRef.current.player.y = 280;
    stateRef.current.player.vx = 0;
    stateRef.current.player.vy = 0;
    setCurrentLevel(lvl);
    setGameState('playing');
  };

  // Game Loop
  useEffect(() => {
    initLevel(1);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const GRAVITY = 0.65;
    const ACCEL = 0.8;
    const FRICTION = 0.82;
    const MAX_SPEED = 5.2;
    const JUMP_FORCE = -12.5;

    let cameraX = 0;

    const loop = () => {
      const { player, keys, levelData } = stateRef.current;

      if (!levelData || gameState === 'game_over' || gameState === 'all_clear') {
        stateRef.current.animationId = requestAnimationFrame(loop);
        return;
      }

      // Physics input
      if (keys.left) {
        player.vx -= ACCEL;
        player.facing = 'left';
      }
      if (keys.right) {
        player.vx += ACCEL;
        player.facing = 'right';
      }

      // Jumping
      if (keys.jump && player.isGrounded) {
        player.vy = JUMP_FORCE;
        player.isGrounded = false;
      }

      // Apply friction and gravity
      player.vx *= FRICTION;
      player.vy += GRAVITY;

      // Limit speed
      player.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, player.vx));

      // Horizontal movement & boundary
      player.x += player.vx;
      if (player.x < 10) player.x = 10;

      // Vertical movement & ground collision
      player.y += player.vy;
      player.isGrounded = false;

      // Check block/platform collisions
      for (const plat of levelData.platforms) {
        if (
          player.x + player.width > plat.x &&
          player.x < plat.x + plat.width &&
          player.y + player.height >= plat.y &&
          player.y + player.height <= plat.y + 18 &&
          player.vy >= 0
        ) {
          player.y = plat.y - player.height;
          player.vy = 0;
          player.isGrounded = true;
          break;
        }
      }

      // Check gap hazards
      for (const gap of levelData.obstacles) {
        if (player.x + player.width > gap.x && player.x < gap.x + gap.width && player.y > 320) {
          // Fell into pit
          handleDeath();
          break;
        }
      }

      // Check pit fall
      if (player.y > 420) {
        handleDeath();
      }

      // Check Coins
      for (const c of levelData.coins) {
        if (!c.collected) {
          const dx = (player.x + player.width / 2) - c.x;
          const dy = (player.y + player.height / 2) - c.y;
          if (Math.hypot(dx, dy) < player.width / 2 + c.radius) {
            c.collected = true;
            setCoins(prev => prev + 1);
            setScore(prev => prev + 100);
          }
        }
      }

      // Check Level Goal
      if (player.x >= levelData.goal.x - 10) {
        handleLevelVictory();
      }

      // Smooth camera follow
      cameraX = Math.max(0, player.x - 220);

      // --- RENDER ---
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(-cameraX, 0);

      // Sky Background gradient
      const skyGrad = ctx.createLinearGradient(cameraX, 0, cameraX, canvas.height);
      skyGrad.addColorStop(0, '#38bdf8');
      skyGrad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(cameraX, 0, canvas.width, canvas.height);

      // Distant mountains / decorative
      ctx.fillStyle = 'rgba(14, 165, 233, 0.25)';
      for (let i = 0; i < 15; i++) {
        const mx = i * 250;
        ctx.beginPath();
        ctx.moveTo(mx, 340);
        ctx.lineTo(mx + 120, 160);
        ctx.lineTo(mx + 240, 340);
        ctx.fill();
      }

      // Draw Platforms
      for (const plat of levelData.platforms) {
        if (plat.type === 'ground') {
          // Ground texture
          ctx.fillStyle = '#16a34a';
          ctx.fillRect(plat.x, plat.y, plat.width, 10);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(plat.x, plat.y + 10, plat.width, plat.height - 10);
        } else {
          // Floating block
          ctx.fillStyle = '#b45309';
          ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(plat.x + 2, plat.y + 2, plat.width - 4, 3);
        }
      }

      // Draw Coins ⭐
      for (const c of levelData.coins) {
        if (!c.collected) {
          ctx.beginPath();
          ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#eab308';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#ca8a04';
          ctx.stroke();

          ctx.fillStyle = '#fff';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('$', c.x - 3, c.y + 3);
        }
      }

      // Draw Goal Post / Flag 🚩
      const goal = levelData.goal;
      ctx.fillStyle = '#fff';
      ctx.fillRect(goal.x, goal.y, 6, goal.height);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(goal.x + 6, goal.y + 10);
      ctx.lineTo(goal.x + 40, goal.y + 25);
      ctx.lineTo(goal.x + 6, goal.y + 40);
      ctx.fill();

      // Draw Player Character (Mario-inspired sprite runner)
      ctx.fillStyle = '#dc2626'; // Red cap/shirt
      ctx.fillRect(player.x + 4, player.y + 4, player.width - 8, 16);

      ctx.fillStyle = '#1d4ed8'; // Blue overalls
      ctx.fillRect(player.x + 2, player.y + 18, player.width - 4, 14);

      // Shoes
      ctx.fillStyle = '#78350f';
      ctx.fillRect(player.x + 1, player.y + 32, 10, 6);
      ctx.fillRect(player.x + player.width - 11, player.y + 32, 10, 6);

      // Eyes/Face direction
      ctx.fillStyle = '#fde047'; // Face
      ctx.fillRect(player.x + (player.facing === 'right' ? 12 : 2), player.y + 8, 10, 8);

      ctx.restore();

      stateRef.current.animationId = requestAnimationFrame(loop);
    };

    stateRef.current.animationId = requestAnimationFrame(loop);

    return () => {
      if (stateRef.current.animationId) {
        cancelAnimationFrame(stateRef.current.animationId);
      }
    };
  }, [gameState]);

  const handleDeath = () => {
    setLives(prev => {
      const nextLives = prev - 1;
      if (nextLives <= 0) {
        setGameState('game_over');
      } else {
        // Respawn
        stateRef.current.player.x = 60;
        stateRef.current.player.y = 280;
        stateRef.current.player.vx = 0;
        stateRef.current.player.vy = 0;
      }
      return nextLives;
    });
  };

  const handleLevelVictory = () => {
    const nextLvl = currentLevel + 1;
    setScore(prev => prev + 500);

    if (nextLvl > 30) {
      setGameState('all_clear');
    } else {
      setGameState('level_clear');
    }
  };

  const nextLevel = () => {
    initLevel(currentLevel + 1);
  };

  const restartGame = () => {
    setLives(3);
    setScore(0);
    setCoins(0);
    initLevel(1);
  };

  return (
    <AulaLayout>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Header Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.2rem 0.55rem',
                borderRadius: '999px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: '#d97706'
              }}>
                ZONA DE RECREACIÓN &amp; PAUSA ACTIVA
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Minijuego Recreativo Externo (30 Niveles)
              </span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
              Super Mario: Reto de los 30 Niveles 🍄
            </h1>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Espacio lúdico de descanso entre clases y tareas. <strong>Actividad externa: No recopila telemetría ni datos biométricos para la investigación.</strong>
            </p>
          </div>

          {/* Controls hint */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)'
          }}>
            <span>Moverse: <kbd style={{ padding: '0.1rem 0.35rem', background: 'var(--bg-canvas)', borderRadius: '3px', border: '1px solid var(--border-subtle)' }}>A / D</kbd> o <kbd style={{ padding: '0.1rem 0.35rem', background: 'var(--bg-canvas)', borderRadius: '3px', border: '1px solid var(--border-subtle)' }}>&larr; &rarr;</kbd></span>
            <span>&bull;</span>
            <span>Saltar: <kbd style={{ padding: '0.1rem 0.35rem', background: 'var(--bg-canvas)', borderRadius: '3px', border: '1px solid var(--border-subtle)' }}>Espacio</kbd> o <kbd style={{ padding: '0.1rem 0.35rem', background: 'var(--bg-canvas)', borderRadius: '3px', border: '1px solid var(--border-subtle)' }}>W</kbd></span>
          </div>
        </div>

        {/* HUD Game Top Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          backgroundColor: '#0f172a',
          color: '#fff',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          fontWeight: 700
        }}>
          <div>NIVEL: <span style={{ color: '#38bdf8' }}>{String(currentLevel).padStart(2, '0')}/30</span></div>
          <div>PUNTOS: <span style={{ color: '#facc15' }}>{score}</span></div>
          <div>MONEDAS: <span style={{ color: '#facc15' }}>${coins}</span></div>
          <div>VIDAS: <span style={{ color: '#ef4444' }}>{'❤️'.repeat(lives)}</span></div>
        </div>

        {/* Canvas Game Area */}
        <div style={{ position: 'relative', width: '100%', backgroundColor: '#000', lineHeight: 0, overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            width={880}
            height={380}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />

          {/* Overlay states */}
          {gameState === 'level_clear' && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <Trophy size={48} style={{ color: '#facc15', marginBottom: '0.75rem' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
                ¡NIVEL {currentLevel} SUPERADO!
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 1.25rem 0' }}>
                Excelente coordinación y ritmo de pulsación registrado.
              </p>
              <button
                type="button"
                onClick={nextLevel}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                <span>Siguiente Nivel ({currentLevel + 1}/30)</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {gameState === 'game_over' && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#ef4444' }}>
                GAME OVER
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 1.25rem 0' }}>
                Te has quedado sin vidas en el Nivel {currentLevel}.
              </p>
              <button
                type="button"
                onClick={restartGame}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={16} />
                <span>Reintentar desde Nivel 1</span>
              </button>
            </div>
          )}

          {gameState === 'all_clear' && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <Trophy size={60} style={{ color: '#facc15', marginBottom: '0.75rem' }} />
              <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#facc15' }}>
                ¡FELICITACIONES! 30/30 NIVELES COMPLETADOS
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: '0 0 1.25rem 0' }}>
                Has completado todos los 30 niveles del aula virtual con un desempeño motor y biométrico sobresaliente.
              </p>
              <button
                type="button"
                onClick={restartGame}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Volver a Jugar
              </button>
            </div>
          )}
        </div>

        {/* Recreational Game Guide & Controls Panel */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Gamepad2 size={18} style={{ color: 'var(--brand-500)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Guía de Juego &amp; Mecánicas (Pausa Activa Recreativa)
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Módulo lúdico independiente (sin telemetría)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-canvas)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--brand-500)', marginBottom: '0.25rem' }}>
                🎮 Controles del Teclado
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Usa <strong>&larr; &rarr;</strong> o <strong>A / D</strong> para desplazarte y <strong>Espacio</strong> o <strong>W</strong> para saltar sobre las plataformas.
              </div>
            </div>

            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-canvas)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', marginBottom: '0.25rem' }}>
                🏆 Objetivo de los 30 Niveles
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Recoge las monedas (+100 pts) y alcanza el mástil al final de cada recorrido para avanzar de nivel progresivamente.
              </div>
            </div>

            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-canvas)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.25rem' }}>
                🛡️ Independencia Científica
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Este juego no registra métricas biométricas. La autenticación y adaptación se realizan exclusivamente en el login y redacción académica.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AulaLayout>
  );
}
