import React, { useState, useEffect } from 'react';

const BOARD_SIZE = 9; // 演示用小棋盘
const EMPTY = 0;
const PLAYER = 1;
const AI = 2;

// 评分表
const SCORES = {
    FIVE: 100000000,
    LIVE_FOUR: 10000000,
    RUSH_FOUR: 5000000,
    LIVE_THREE: 500000,
    SLEEP_THREE: 50000,
    LIVE_TWO: 10000,
    SLEEP_TWO: 1000,
};

const DIRECTIONS = [
    [0, 1],   // 横
    [1, 0],   // 竖
    [1, 1],   // 右斜
    [1, -1]   // 左斜
];

export default function Demo() {
    const [board, setBoard] = useState(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY)));
    const [searchDepth, setSearchDepth] = useState(3);
    const [algorithmSteps, setAlgorithmSteps] = useState([]);
    const [evaluationMap, setEvaluationMap] = useState({});
    const [pruningCount, setPruningCount] = useState(0);
    const [searchedNodes, setSearchedNodes] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState(null);
    const [thinking, setThinking] = useState(false);

    // 检查获胜
    const checkWin = (board, row, col, player) => {
        for (const [dx, dy] of DIRECTIONS) {
            let count = 1;
            let r = row + dx, c = col + dy;
            while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
                count++;
                r += dx;
                c += dy;
            }
            r = row - dx;
            c = col - dy;
            while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
                count++;
                r -= dx;
                c -= dy;
            }
            if (count >= 5) return true;
        }
        return false;
    };

    // 获取线上棋子
    const getLine = (board, row, col, dx, dy) => {
        const line = [];
        for (let i = -4; i <= 4; i++) {
            const r = row + i * dx;
            const c = col + i * dy;
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                line.push(board[r][c]);
            } else {
                line.push(-1);
            }
        }
        return line;
    };

    // 评估棋型
    const evaluateShape = (line, player) => {
        const lineStr = line.join('');
        let score = 0;

        if (lineStr.includes(player.toString().repeat(5))) return SCORES.FIVE;
        if (lineStr.includes(`0${player}${player}${player}${player}0`)) score += SCORES.LIVE_FOUR;

        const rushFours = [
            `${player}${player}${player}${player}0`,
            `0${player}${player}${player}${player}`,
        ];
        for (const pattern of rushFours) {
            if (lineStr.includes(pattern)) score += SCORES.RUSH_FOUR;
        }

        if (lineStr.includes(`0${player}${player}${player}0`)) score += SCORES.LIVE_THREE;
        if (lineStr.includes(`${player}${player}${player}0`) || lineStr.includes(`0${player}${player}${player}`)) {
            score += SCORES.SLEEP_THREE;
        }

        return score;
    };

    // 评估点位
    const evaluatePoint = (board, row, col, player) => {
        let score = 0;
        const opponent = player === PLAYER ? AI : PLAYER;

        for (const [dx, dy] of DIRECTIONS) {
            const line = getLine(board, row, col, dx, dy);
            score += evaluateShape(line, player);
            score += evaluateShape(line, opponent) * 1.2;
        }

        return Math.round(score);
    };

    // 获取候选位置
    const getCandidates = (board) => {
        const candidates = [];
        let hasStone = false;

        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (board[i][j] !== EMPTY) {
                    hasStone = true;
                    break;
                }
            }
            if (hasStone) break;
        }

        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (board[i][j] !== EMPTY) continue;

                let hasNeighbor = false;
                for (let di = -1; di <= 1; di++) {
                    for (let dj = -1; dj <= 1; dj++) {
                        const ni = i + di, nj = j + dj;
                        if (ni >= 0 && ni < BOARD_SIZE && nj >= 0 && nj < BOARD_SIZE && board[ni][nj] !== EMPTY) {
                            hasNeighbor = true;
                            break;
                        }
                    }
                    if (hasNeighbor) break;
                }

                if (hasNeighbor || (!hasStone && i === Math.floor(BOARD_SIZE/2) && j === Math.floor(BOARD_SIZE/2))) {
                    const score = evaluatePoint(board, i, j, AI);
                    candidates.push({ row: i, col: j, score });
                }
            }
        }
        return candidates.sort((a, b) => b.score - a.score).slice(0, 8);
    };

    // MiniMax with Alpha-Beta
    const minimax = (board, depth, alpha, beta, maximizing) => {
        setSearchedNodes(prev => prev + 1);

        if (depth === 0) {
            let score = 0;
            for (let i = 0; i < BOARD_SIZE; i++) {
                for (let j = 0; j < BOARD_SIZE; j++) {
                    if (board[i][j] !== EMPTY) {
                        if (checkWin(board, i, j, AI)) return SCORES.FIVE;
                        if (checkWin(board, i, j, PLAYER)) return -SCORES.FIVE;
                        score += evaluatePoint(board, i, j, board[i][j]) * (board[i][j] === AI ? 1 : -1);
                    }
                }
            }
            return score;
        }

        const moves = getCandidates(board);
        if (moves.length === 0) return 0;

        let bestScore = maximizing ? -Infinity : Infinity;

        for (const move of moves) {
            const player = maximizing ? AI : PLAYER;
            board[move.row][move.col] = player;

            if (checkWin(board, move.row, move.col, player)) {
                board[move.row][move.col] = EMPTY;
                return maximizing ? SCORES.FIVE : -SCORES.FIVE;
            }

            const score = minimax(board, depth - 1, alpha, beta, !maximizing);
            board[move.row][move.col] = EMPTY;

            if (maximizing) {
                bestScore = Math.max(bestScore, score);
                alpha = Math.max(alpha, score);
            } else {
                bestScore = Math.min(bestScore, score);
                beta = Math.min(beta, score);
            }

            if (beta <= alpha) {
                setPruningCount(prev => prev + 1);
                break;
            }
        }

        return bestScore;
    };

    // AI 下棋
    const makeAIMove = (currentBoard) => {
        setThinking(true);
        setSearchedNodes(0);
        setPruningCount(0);

        setTimeout(() => {
            const boardCopy = currentBoard.map(r => [...r]);
            const candidates = getCandidates(boardCopy);
            let bestMove = null;
            let bestScore = -Infinity;

            const newEvalMap = {};
            for (const move of candidates) {
                boardCopy[move.row][move.col] = AI;
                const score = minimax(boardCopy, searchDepth - 1, -Infinity, Infinity, false);
                boardCopy[move.row][move.col] = EMPTY;

                newEvalMap[`${move.row}-${move.col}`] = score;

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }

            setEvaluationMap(newEvalMap);

            if (bestMove) {
                const newBoard = currentBoard.map(r => [...r]);
                newBoard[bestMove.row][bestMove.col] = AI;
                setBoard(newBoard);

                setAlgorithmSteps(prev => [...prev, {
                    player: 'AI',
                    position: `(${bestMove.row}, ${bestMove.col})`,
                    score: bestScore,
                    depth: searchDepth,
                    timestamp: Date.now()
                }]);

                // 检查AI是否获胜
                if (checkWin(newBoard, bestMove.row, bestMove.col, AI)) {
                    setGameOver(true);
                    setWinner(AI);
                }
            }

            setThinking(false);
        }, 500);
    };

    // 玩家下棋
    const handleCellClick = (row, col) => {
        if (board[row][col] !== EMPTY || thinking || gameOver) return;

        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = PLAYER;
        setBoard(newBoard);

        const playerScore = evaluatePoint(newBoard, row, col, PLAYER);
        setAlgorithmSteps(prev => [...prev, {
            player: '玩家',
            position: `(${row}, ${col})`,
            score: playerScore,
            depth: '-',
            timestamp: Date.now()
        }]);

        // 检查玩家是否获胜
        if (checkWin(newBoard, row, col, PLAYER)) {
            setGameOver(true);
            setWinner(PLAYER);
            return;
        }

        // AI下棋
        makeAIMove(newBoard);
    };

    // 重置
    const handleReset = () => {
        setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY)));
        setAlgorithmSteps([]);
        setEvaluationMap({});
        setPruningCount(0);
        setSearchedNodes(0);
        setGameOver(false);
        setWinner(null);
        setThinking(false);
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '24px'
        }}>
            <div style={{
                maxWidth: '1600px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: '350px 1fr 400px',
                gap: '24px'
            }}>
                {/* 左侧：算法说明 */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '20px',
                        paddingBottom: '16px',
                        borderBottom: '2px solid #f0f0f0'
                    }}>
                        <span style={{ fontSize: '24px' }}>💡</span>
                        <h2 style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: '#1f2937',
                            margin: 0
                        }}>算法说明</h2>
                    </div>

                    <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#4b5563' }}>
                        <h3 style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#667eea',
                            marginBottom: '12px'
                        }}>MiniMax 算法</h3>
                        <p style={{ marginBottom: '16px' }}>
                            MiniMax 是一种博弈树搜索算法，用于在双人零和游戏中找到最优策略。
                        </p>

                        <div style={{
                            background: '#f9fafb',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '16px'
                        }}>
                            <p style={{ fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>核心思想：</p>
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                <li>最大化层（AI）：选择得分最高的走法</li>
                                <li>最小化层（人类）：假设对手选择对自己最不利的走法</li>
                                <li>递归搜索到指定深度后评估局面</li>
                            </ul>
                        </div>

                        <h3 style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#764ba2',
                            marginBottom: '12px'
                        }}>Alpha-Beta 剪枝</h3>
                        <p style={{ marginBottom: '16px' }}>
                            通过维护 α 和 β 两个值，剪掉不可能影响最终决策的分支，大幅提升搜索效率。
                        </p>

                        <div style={{
                            background: '#fef3c7',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '2px solid #fbbf24'
                        }}>
                            <p style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '8px' }}>剪枝条件：</p>
                            <ul style={{ margin: 0, paddingLeft: '20px', color: '#92400e' }}>
                                <li>当 β ≤ α 时，停止搜索该分支</li>
                                <li>最大化层：α = max(α, score)</li>
                                <li>最小化层：β = min(β, score)</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 中间：棋盘演示 */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}>
                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '20px'
                    }}>算法演示</h2>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                        padding: '16px',
                        background: 'linear-gradient(135deg, #eff6ff 0%, #f3e8ff 100%)',
                        borderRadius: '12px'
                    }}>
                        <div>
                            <span style={{ fontWeight: '500', marginRight: '8px' }}>搜索深度：</span>
                            <select
                                value={searchDepth}
                                onChange={(e) => setSearchDepth(Number(e.target.value))}
                                disabled={thinking || gameOver}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: '2px solid #c7d2fe',
                                    background: 'white',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                <option value={2}>2 层</option>
                                <option value={3}>3 层</option>
                                <option value={4}>4 层</option>
                            </select>
                        </div>

                        <button
                            onClick={handleReset}
                            style={{
                                padding: '8px 20px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                            }}
                        >
                            🔄 重置棋盘
                        </button>
                    </div>

                    {gameOver && (
                        <div style={{
                            padding: '16px',
                            marginBottom: '16px',
                            background: winner === PLAYER ?
                                'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' :
                                'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)',
                            borderRadius: '12px',
                            textAlign: 'center',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: winner === PLAYER ? '#065f46' : '#991b1b'
                        }}>
                            {winner === PLAYER ? '🎉 玩家获胜！' : '🤖 AI 获胜！'}
                        </div>
                    )}

                    {thinking && (
                        <div style={{
                            padding: '12px',
                            marginBottom: '16px',
                            background: '#fef3c7',
                            borderRadius: '8px',
                            textAlign: 'center',
                            color: '#92400e',
                            fontWeight: '500'
                        }}>
                            🤔 AI 正在思考中...
                        </div>
                    )}

                    {/* 棋盘 */}
                    <div style={{
                        background: '#d97706',
                        borderRadius: '12px',
                        padding: '20px',
                        display: 'flex',
                        justifyContent: 'center',
                        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)'
                    }}>
                        <div>
                            {board.map((row, i) => (
                                <div key={i} style={{ display: 'flex' }}>
                                    {row.map((cell, j) => {
                                        const key = `${i}-${j}`;
                                        const evalScore = evaluationMap[key];

                                        return (
                                            <div
                                                key={j}
                                                onClick={() => handleCellClick(i, j)}
                                                style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    position: 'relative',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRight: j < BOARD_SIZE - 1 ? '1px solid rgba(101, 67, 33, 0.3)' : 'none',
                                                    borderBottom: i < BOARD_SIZE - 1 ? '1px solid rgba(101, 67, 33, 0.3)' : 'none',
                                                    cursor: cell === EMPTY && !thinking && !gameOver ? 'pointer' : 'default',
                                                    background: evalScore && cell === EMPTY ?
                                                        `rgba(102, 126, 234, ${Math.min(Math.abs(evalScore) / 1000000, 0.3)})` : 'transparent'
                                                }}
                                            >
                                                {cell !== EMPTY && (
                                                    <div style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        background: cell === PLAYER ? '#1f2937' : 'white',
                                                        border: cell === PLAYER ? '2px solid #374151' : '2px solid #d1d5db',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                                    }} />
                                                )}
                                                {evalScore && cell === EMPTY && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        fontSize: '10px',
                                                        color: '#4b5563',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {Math.round(evalScore / 1000)}k
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 统计信息 */}
                    <div style={{
                        marginTop: '20px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px'
                    }}>
                        <div style={{
                            padding: '12px',
                            background: '#f0f9ff',
                            borderRadius: '8px',
                            border: '2px solid #0ea5e9'
                        }}>
                            <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: '500' }}>搜索节点数</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0c4a6e' }}>{searchedNodes}</div>
                        </div>
                        <div style={{
                            padding: '12px',
                            background: '#fef3c7',
                            borderRadius: '8px',
                            border: '2px solid #fbbf24'
                        }}>
                            <div style={{ fontSize: '12px', color: '#92400e', fontWeight: '500' }}>剪枝次数</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#78350f' }}>{pruningCount}</div>
                        </div>
                    </div>
                </div>

                {/* 右侧：搜索树可视化 */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '800px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '20px',
                        paddingBottom: '16px',
                        borderBottom: '2px solid #f0f0f0'
                    }}>
                        <span style={{ fontSize: '24px' }}>🌲</span>
                        <h2 style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: '#1f2937',
                            margin: 0
                        }}>搜索树可视化</h2>
                    </div>

                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        fontSize: '13px'
                    }}>
                        {algorithmSteps.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                color: '#9ca3af',
                                padding: '40px 20px'
                            }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎮</div>
                                <p>开始下棋查看算法搜索过程</p>
                            </div>
                        ) : (
                            algorithmSteps.map((step, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        marginBottom: '12px',
                                        padding: '12px',
                                        background: step.player === 'AI' ?
                                            'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' :
                                            'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                        borderRadius: '8px',
                                        border: step.player === 'AI' ? '2px solid #3b82f6' : '2px solid #fbbf24'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '8px'
                                    }}>
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: step.player === 'AI' ? '#1e40af' : '#92400e'
                                        }}>
                                            {step.player === 'AI' ? '🤖 AI' : '👤 玩家'}
                                        </span>
                                        <span style={{
                                            fontSize: '12px',
                                            padding: '2px 8px',
                                            background: 'white',
                                            borderRadius: '4px',
                                            color: '#6b7280'
                                        }}>
                                            第 {idx + 1} 步
                                        </span>
                                    </div>
                                    <div style={{ color: '#4b5563' }}>
                                        <div>位置: <strong>{step.position}</strong></div>
                                        <div>评分: <strong style={{ color: '#059669' }}>{step.score.toLocaleString()}</strong></div>
                                        <div>深度: <strong>{step.depth}</strong></div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
