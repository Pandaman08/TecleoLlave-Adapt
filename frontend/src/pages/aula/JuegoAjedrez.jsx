import React, { useState } from 'react';
import AulaLayout from '../../components/aula/AulaLayout';
import {
  Crown,
  RotateCcw,
  Sparkles,
  Activity,
  Award,
  ChevronRight,
  Clock,
  Send,
  HelpCircle
} from 'lucide-react';

const INITIAL_BOARD = [
  ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
  ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
  ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
];

export default function JuegoAjedrez() {
  const [board, setBoard] = useState(INITIAL_BOARD);
  const [selectedSquare, setSelectedSquare] = useState(null); // [row, col]
  const [turn, setTurn] = useState('white'); // 'white' | 'black'
  const [moveHistory, setMoveHistory] = useState([]);
  const [notationInput, setNotationInput] = useState('');

  const toChessCoord = (col, row) => {
    const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    return `${letters[col]}${8 - row}`;
  };

  // Square Click Handler for Interactive Board
  const handleSquareClick = (row, col) => {
    const piece = board[row][col];

    if (selectedSquare) {
      const [selRow, selCol] = selectedSquare;
      if (selRow === row && selCol === col) {
        setSelectedSquare(null);
        return;
      }

      // Move piece
      const newBoard = board.map(r => [...r]);
      const movingPiece = newBoard[selRow][selCol];
      newBoard[row][col] = movingPiece;
      newBoard[selRow][selCol] = '';

      setBoard(newBoard);
      setSelectedSquare(null);

      // Register move
      recordMove(`${toChessCoord(selCol, selRow)} &rarr; ${toChessCoord(col, row)} (${movingPiece})`);
    } else {
      if (piece) {
        setSelectedSquare([row, col]);
      }
    }
  };

  // Move history for the match
  const recordMove = (moveDesc) => {
    const nextTurn = turn === 'white' ? 'black' : 'white';
    setTurn(nextTurn);

    setMoveHistory(prev => [
      ...prev,
      { move: moveDesc, player: turn, time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }) }
    ]);
  };

  const handleApplyNotation = (e) => {
    e.preventDefault();
    if (!notationInput.trim()) return;

    recordMove(`Notación: ${notationInput.trim()}`);
    setNotationInput('');
  };

  const handleReset = () => {
    setBoard(INITIAL_BOARD);
    setSelectedSquare(null);
    setTurn('white');
    setMoveHistory([]);
  };

  return (
    <AulaLayout>
      <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.2rem 0.55rem',
                borderRadius: '999px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--success)'
              }}>
                ZONA DE RECREACIÓN &amp; PAUSA ACTIVA
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Minijuego Recreativo Externo
              </span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
              Ajedrez Universitario ♟️
            </h1>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Partida táctica de descanso entre horas de estudio. <strong>Actividad externa: No recopila métricas biométricas ni afecta tu perfil de tecleo.</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={15} />
            <span>Reiniciar Tablero</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left: Chessboard */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {/* Turn Banner */}
            <div style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-canvas)',
              fontSize: '0.82rem',
              fontWeight: 700
            }}>
              <span>Turno actual:</span>
              <span style={{
                color: turn === 'white' ? 'var(--brand-500)' : '#f59e0b',
                textTransform: 'uppercase'
              }}>
                {turn === 'white' ? 'Blancas (Tú)' : 'Negras'}
              </span>
            </div>

            {/* 8x8 Board Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 56px)',
              gridTemplateRows: 'repeat(8, 56px)',
              border: '3px solid #334155',
              borderRadius: '4px',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-md)',
              userSelect: 'none'
            }}>
              {board.map((row, rIdx) =>
                row.map((piece, cIdx) => {
                  const isBlack = (rIdx + cIdx) % 2 === 1;
                  const isSelected = selectedSquare && selectedSquare[0] === rIdx && selectedSquare[1] === cIdx;

                  return (
                    <button
                      key={`${rIdx}-${cIdx}`}
                      type="button"
                      onClick={() => handleSquareClick(rIdx, cIdx)}
                      style={{
                        width: '56px',
                        height: '56px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        border: 'none',
                        backgroundColor: isSelected
                          ? '#fde047'
                          : (isBlack ? '#475569' : '#f1f5f9'),
                        color: piece && ['♙', '♖', '♘', '♗', '♕', '♔'].includes(piece) ? '#1e293b' : '#0f172a',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                    >
                      {piece}
                    </button>
                  );
                })
              )}
            </div>

            {/* Algebraic Notation Input */}
            <form
              onSubmit={handleApplyNotation}
              style={{
                width: '100%',
                marginTop: '1.25rem',
                display: 'flex',
                gap: '0.5rem'
              }}
            >
              <input
                type="text"
                placeholder="Ingresa jugada en notación (ej. e4, Nf3, O-O)..."
                value={notationInput}
                onChange={(e) => setNotationInput(e.target.value)}
                onKeyDown={handleNotationKeyDown}
                onKeyUp={handleNotationKeyUp}
                style={{
                  flex: 1,
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-canvas)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
              >
                <Send size={14} />
                <span>Aplicar</span>
              </button>
            </form>
          </div>

          {/* Right: History & Match Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Match Status Card */}
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.85rem' }}>
                <Crown size={16} style={{ color: 'var(--brand-500)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Estado de la Partida
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-canvas)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Turno Actual</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: turn === 'white' ? 'var(--brand-500)' : 'var(--text-primary)' }}>
                    {turn === 'white' ? 'Blancas ⚪' : 'Negras ⚫'}
                  </div>
                </div>

                <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-canvas)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Jugadas Hechas</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)' }}>
                    {moveHistory.length}
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '0.85rem',
                padding: '0.65rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.15)',
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.4
              }}>
                Pausa activa de relajación mental. Los datos de la tesis provienen exclusivamente del login y de tareas académicas.
              </div>
            </div>

            {/* Move History */}
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-sm)',
              maxHeight: '280px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                Registro de Jugadas
              </span>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {moveHistory.length === 0 ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No se han realizado jugadas aún.
                  </span>
                ) : (
                  moveHistory.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.4rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-canvas)',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span dangerouslySetInnerHTML={{ __html: `${idx + 1}. ${m.move}` }} />
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{m.time}s</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AulaLayout>
  );
}
