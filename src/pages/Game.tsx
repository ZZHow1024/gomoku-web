import { useState, useEffect, useRef } from 'react';

const BOARD_SIZE = 15;
const EMPTY = 0;
const PLAYER = 1;
const AI = 2;
const SEARCH_DEPTH = 4; // 增加搜索深度

// 评估方向
const DIRECTIONS = [
    [0, 1],   // 横
    [1, 0],   // 竖
    [1, 1],   // 右斜
    [1, -1]   // 左斜
];

// 更精细的评分表
const SCORES = {
    FIVE: 100000000,
    LIVE_FOUR: 10000000,
    RUSH_FOUR: 5000000,
    LIVE_THREE: 500000,
    SLEEP_THREE: 50000,
    LIVE_TWO: 10000,
    SLEEP_TWO: 1000,
    LIVE_ONE: 100,
    LONG: -100000 // 长连惩罚
};

// 棋型模式匹配
const PATTERNS = {
    FIVE: /11111|22222/,
    LIVE_FOUR: /011110|022220/,
    RUSH_FOUR: /11110|01111|22220|02222|11011|22022|10111|20222|11101|22202/,
    LIVE_THREE: /01110|02220|011010|022020|010110|020220/,
    SLEEP_THREE: /11100|00111|22200|00222|11010|01101|22020|02202|10110|01011|20220|02022/,
    LIVE_TWO: /00110|01100|01010|02020|00220|02200/,
    SLEEP_TWO: /11000|00011|22000|00022|10100|00101|20200|00202|10010|01001|20020|02002/
};

export default function Game() {
    const [board, setBoard] = useState(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY)));
    const [currentPlayer, setCurrentPlayer] = useState(PLAYER);
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState(null);
    const [playerStarts, setPlayerStarts] = useState(true);
    const [thinking, setThinking] = useState(false);
    const [lastMove, setLastMove] = useState(null);
    const [moveCount, setMoveCount] = useState(0);

    const zobristTable = useRef(null);
    const transpositionTable = useRef(new Map());

    // 初始化Zobrist哈希表
    useEffect(() => {
        if (!zobristTable.current) {
            zobristTable.current = Array(BOARD_SIZE).fill(null).map(() =>
                Array(BOARD_SIZE).fill(null).map(() => ({
                    [PLAYER]: Math.floor(Math.random() * 0x7FFFFFFF),
                    [AI]: Math.floor(Math.random() * 0x7FFFFFFF)
                }))
            );
        }
    }, []);

    // 初始化游戏
    const initGame = (playerFirst) => {
        const newBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
        setBoard(newBoard);
        setCurrentPlayer(playerFirst ? PLAYER : AI);
        setGameOver(false);
        setWinner(null);
        setPlayerStarts(playerFirst);
        setThinking(false);
        setLastMove(null);
        setMoveCount(0);
        transpositionTable.current.clear();
    };

    // AI自动下棋
    useEffect(() => {
        if (currentPlayer === AI && !gameOver) {
            setThinking(true);
            setTimeout(() => {
                const move = getBestMove(board);
                if (move) {
                    makeMove(move.row, move.col);
                }
                setThinking(false);
            }, 100);
        }
    }, [currentPlayer, gameOver]);

    // 计算Zobrist哈希值
    const computeHash = (board) => {
        let hash = 0;
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (board[i][j] !== EMPTY) {
                    hash ^= zobristTable.current[i][j][board[i][j]];
                }
            }
        }
        return hash;
    };

    // 检查是否五连
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

    // 获取一条线上的棋子序列
    const getLine = (board, row, col, dx, dy, len = 9) => {
        const line = [];
        const half = Math.floor(len / 2);

        for (let i = -half; i <= half; i++) {
            const r = row + i * dx;
            const c = col + i * dy;
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                line.push(board[r][c]);
            } else {
                line.push(-1); // 边界标记
            }
        }
        return line;
    };

    // 评估棋型得分
    const evaluateShape = (line, player) => {
        const lineStr = line.join('');
        let score = 0;

        // 五连
        if (lineStr.includes(player.toString().repeat(5))) {
            return SCORES.FIVE;
        }

        // 活四
        const liveFour = `0${player.toString().repeat(4)}0`;
        if (lineStr.includes(liveFour)) {
            score += SCORES.LIVE_FOUR;
        }

        // 冲四（多种形态）
        const rushFours = [
            `${player}${player}${player}${player}0`,
            `0${player}${player}${player}${player}`,
            `${player}${player}0${player}${player}`,
            `${player}0${player}${player}${player}`,
            `${player}${player}${player}0${player}`
        ];
        for (const pattern of rushFours) {
            if (lineStr.includes(pattern)) {
                score += SCORES.RUSH_FOUR;
            }
        }

        // 活三
        const liveThrees = [
            `0${player}${player}${player}0`,
            `0${player}0${player}${player}0`,
            `0${player}${player}0${player}0`
        ];
        for (const pattern of liveThrees) {
            if (lineStr.includes(pattern)) {
                score += SCORES.LIVE_THREE;
            }
        }

        // 眠三
        const sleepThrees = [
            `${player}${player}${player}0`,
            `0${player}${player}${player}`,
            `${player}0${player}${player}`,
            `${player}${player}0${player}`
        ];
        for (const pattern of sleepThrees) {
            if (lineStr.includes(pattern)) {
                score += SCORES.SLEEP_THREE;
            }
        }

        // 活二
        const liveTwos = [
            `00${player}${player}0`,
            `0${player}${player}00`,
            `0${player}0${player}0`
        ];
        for (const pattern of liveTwos) {
            if (lineStr.includes(pattern)) {
                score += SCORES.LIVE_TWO;
            }
        }

        // 长连惩罚
        if (lineStr.includes(player.toString().repeat(6))) {
            score += SCORES.LONG;
        }

        return score;
    };

    // 评估单个点位的分数
    const evaluatePoint = (board, row, col, player) => {
        let score = 0;
        const opponent = player === PLAYER ? AI : PLAYER;

        // 中心位置加权
        const centerDist = Math.abs(row - 7) + Math.abs(col - 7);
        score += (14 - centerDist) * 10;

        // 评估四个方向
        for (const [dx, dy] of DIRECTIONS) {
            const line = getLine(board, row, col, dx, dy);

            // 自己的棋型
            score += evaluateShape(line, player);

            // 对手的棋型（防守）
            score += evaluateShape(line, opponent) * 1.2;
        }

        return score;
    };

    // 威胁检测 - 必须立即应对的点
    const findCriticalMoves = (board, player) => {
        const critical = [];
        const opponent = player === PLAYER ? AI : PLAYER;

        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (board[i][j] !== EMPTY) continue;

                board[i][j] = opponent;
                if (checkWin(board, i, j, opponent)) {
                    critical.push({ row: i, col: j, priority: 1000 });
                } else {
                    // 检查是否形成活四
                    for (const [dx, dy] of DIRECTIONS) {
                        const line = getLine(board, i, j, dx, dy);
                        const lineStr = line.join('');
                        if (lineStr.includes(`0${opponent}${opponent}${opponent}${opponent}0`)) {
                            critical.push({ row: i, col: j, priority: 900 });
                            break;
                        }
                    }
                }
                board[i][j] = EMPTY;

                // 检查自己能否获胜
                board[i][j] = player;
                if (checkWin(board, i, j, player)) {
                    return [{ row: i, col: j, priority: 10000 }];
                }
                board[i][j] = EMPTY;
            }
        }

        return critical;
    };

    // 获取候选落子点（优化版）
    const getCandidateMoves = (board, depth) => {
        const critical = findCriticalMoves(board, AI);
        if (critical.length > 0 && critical[0].priority === 10000) {
            return [critical[0]];
        }

        const candidates = new Map();
        const range = depth <= 2 ? 2 : 1;

        // 收集所有可能的落子点
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (board[i][j] !== EMPTY) continue;

                let hasNeighbor = false;
                for (let di = -range; di <= range; di++) {
                    for (let dj = -range; dj <= range; dj++) {
                        const ni = i + di;
                        const nj = j + dj;
                        if (ni >= 0 && ni < BOARD_SIZE && nj >= 0 && nj < BOARD_SIZE && board[ni][nj] !== EMPTY) {
                            hasNeighbor = true;
                            break;
                        }
                    }
                    if (hasNeighbor) break;
                }

                if (hasNeighbor || (moveCount === 0 && i === 7 && j === 7)) {
                    const score = evaluatePoint(board, i, j, AI) + evaluatePoint(board, i, j, PLAYER) * 1.1;
                    candidates.set(`${i},${j}`, { row: i, col: j, score });
                }
            }
        }

        // 排序并返回前N个最佳候选点
        const sorted = Array.from(candidates.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, depth <= 2 ? 15 : 8);

        // 如果有关键点，优先考虑
        return critical.length > 0 ? [...critical, ...sorted].slice(0, 10) : sorted;
    };

    // MiniMax算法 + Alpha-Beta剪枝 + 置换表
    const minimax = (board, depth, alpha, beta, maximizing, hash) => {
        // 查找置换表
        if (transpositionTable.current.has(hash)) {
            const cached = transpositionTable.current.get(hash);
            if (cached.depth >= depth) {
                return cached.score;
            }
        }

        // 终止条件
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

        const moves = getCandidateMoves(board, depth);
        if (moves.length === 0) return 0;

        let bestScore = maximizing ? -Infinity : Infinity;

        for (const move of moves) {
            const player = maximizing ? AI : PLAYER;
            board[move.row][move.col] = player;

            // 快速胜利检测
            if (checkWin(board, move.row, move.col, player)) {
                board[move.row][move.col] = EMPTY;
                const score = maximizing ? SCORES.FIVE : -SCORES.FIVE;
                transpositionTable.current.set(hash, { score, depth });
                return score;
            }

            const newHash = hash ^ zobristTable.current[move.row][move.col][player];
            const score = minimax(board, depth - 1, alpha, beta, !maximizing, newHash);
            board[move.row][move.col] = EMPTY;

            if (maximizing) {
                bestScore = Math.max(bestScore, score);
                alpha = Math.max(alpha, score);
            } else {
                bestScore = Math.min(bestScore, score);
                beta = Math.min(beta, score);
            }

            if (beta <= alpha) break;
        }

        transpositionTable.current.set(hash, { score: bestScore, depth });
        return bestScore;
    };

    // 获取最佳落子
    const getBestMove = (board) => {
        const critical = findCriticalMoves(board, AI);
        if (critical.length > 0 && critical[0].priority === 10000) {
            return critical[0];
        }

        const moves = getCandidateMoves(board, SEARCH_DEPTH);
        let bestMove = null;
        let bestScore = -Infinity;
        const hash = computeHash(board);

        for (const move of moves) {
            board[move.row][move.col] = AI;

            if (checkWin(board, move.row, move.col, AI)) {
                board[move.row][move.col] = EMPTY;
                return move;
            }

            const newHash = hash ^ zobristTable.current[move.row][move.col][AI];
            const score = minimax(board, SEARCH_DEPTH - 1, -Infinity, Infinity, false, newHash);
            board[move.row][move.col] = EMPTY;

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove || moves[0];
    };

    // 玩家下棋
    const makeMove = (row, col) => {
        if (gameOver || board[row][col] !== EMPTY || thinking) return;

        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = currentPlayer;
        setBoard(newBoard);
        setLastMove({ row, col });
        setMoveCount(moveCount + 1);

        if (checkWin(newBoard, row, col, currentPlayer)) {
            setGameOver(true);
            setWinner(currentPlayer);
        } else {
            setCurrentPlayer(currentPlayer === PLAYER ? AI : PLAYER);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#000000',
            padding: '32px'
        }}>
            <div style={{
                maxWidth: '1400px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '24px'
            }}>
                {/* 算法说明 */}
                <div style={{
                    background: 'white',
                    borderRadius: '24px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    padding: '24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '24px' }}>💡</span>
                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>算法说明</h2>
                    </div>
                    <div style={{ color: '#4b5563', fontSize: '14px', lineHeight: '1.6' }}>
                        <p style={{ marginBottom: '16px' }}>
                            本游戏采用 <strong>增强型 MiniMax 算法</strong> + <strong>Alpha-Beta 剪枝</strong> + <strong>置换表优化</strong> + <strong>Zobrist 哈希</strong> 实现高级 AI 对弈。
                        </p>
                        <p style={{ marginBottom: '16px' }}>
                            <strong>关键优化：</strong><br/>
                            • 威胁检测：优先识别必胜和必防的关键点<br/>
                            • 精细棋型评估：识别活四、冲四、活三等多种棋型<br/>
                            • 启发式搜索：智能排序候选点，减少搜索空间<br/>
                            • 置换表缓存：避免重复计算相同局面<br/>
                            • Zobrist 哈希：快速计算棋盘状态
                        </p>
                        <div style={{
                            marginTop: '16px',
                            padding: '12px',
                            background: '#f3f4f6',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: '#6b7280'
                        }}>
                            <p style={{ margin: 0 }}>搜索深度: {SEARCH_DEPTH} 层</p>
                            <p style={{ margin: 0 }}>棋盘大小: {BOARD_SIZE}×{BOARD_SIZE}</p>
                            <p style={{ margin: 0 }}>已下回合: {moveCount}</p>
                        </div>
                    </div>
                </div>

                {/* 游戏棋盘 */}
                <div style={{
                    background: 'white',
                    borderRadius: '24px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    padding: '24px'
                }}>
                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        marginBottom: '16px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        margin: '0 0 16px 0'
                    }}>
                        五子棋对弈 - 高级 AI
                    </h2>

                    <div style={{
                        background: 'linear-gradient(135deg, #eff6ff 0%, #f3e8ff 100%)',
                        borderRadius: '16px',
                        padding: '16px',
                        marginBottom: '16px'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '14px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: '500' }}>你是:</span>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: '#1f2937',
                                    border: '2px solid #374151'
                                }}></div>
                                <span style={{ fontWeight: 'bold' }}>X</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: '500' }}>AI 是:</span>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: 'white',
                                    border: '2px solid #d1d5db'
                                }}></div>
                                <span style={{ fontWeight: 'bold' }}>O</span>
                            </div>
                        </div>
                    </div>

                    {/* 棋盘 */}
                    <div style={{
                        background: '#b45309',
                        borderRadius: '12px',
                        padding: '16px',
                        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)',
                        backgroundImage: 'linear-gradient(rgba(139, 69, 19, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 69, 19, 0.1) 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        <div style={{
                            background: '#d97706',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            padding: '8px',
                            display: 'inline-block'
                        }}>
                            {board.map((row, i) => (
                                <div key={i} style={{ display: 'flex' }}>
                                    {row.map((cell, j) => {
                                        const isLastMove = lastMove && lastMove.row === i && lastMove.col === j;
                                        return (
                                            <button
                                                key={`${i}-${j}`}
                                                onClick={() => currentPlayer === PLAYER && makeMove(i, j)}
                                                disabled={gameOver || thinking || currentPlayer === AI}
                                                style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    position: 'relative',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: 'none',
                                                    border: 'none',
                                                    borderRight: j < BOARD_SIZE - 1 ? '1px solid rgba(101, 67, 33, 0.3)' : 'none',
                                                    borderBottom: i < BOARD_SIZE - 1 ? '1px solid rgba(101, 67, 33, 0.3)' : 'none',
                                                    cursor: gameOver || thinking || currentPlayer === AI || cell !== EMPTY ? 'not-allowed' : 'pointer',
                                                    transition: 'all 0.2s',
                                                    padding: 0
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!gameOver && !thinking && currentPlayer === PLAYER && cell === EMPTY) {
                                                        e.currentTarget.style.background = 'rgba(217, 119, 6, 0.3)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'none';
                                                }}
                                            >
                                                {cell !== EMPTY && (
                                                    <div style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        borderRadius: '50%',
                                                        boxShadow: isLastMove ? '0 0 0 2px #ef4444' : '0 2px 6px rgba(0,0,0,0.3)',
                                                        transform: 'scale(1)',
                                                        transition: 'all 0.2s',
                                                        background: cell === PLAYER ? '#1f2937' : 'white',
                                                        border: cell === PLAYER ? '2px solid #374151' : '2px solid #d1d5db'
                                                    }} />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {thinking && (
                        <div style={{
                            textAlign: 'center',
                            marginTop: '16px',
                            color: '#9333ea',
                            fontWeight: '500',
                            animation: 'pulse 1.5s ease-in-out infinite'
                        }}>
                            AI 深度思考中...
                        </div>
                    )}

                    {gameOver && (
                        <div style={{ marginTop: '16px', textAlign: 'center' }}>
                            <div style={{
                                fontSize: '24px',
                                fontWeight: 'bold',
                                marginBottom: '8px',
                                color: winner === PLAYER ? '#059669' : '#dc2626'
                            }}>
                                {winner === PLAYER ? '🎉 你赢了！太厉害了！' : '💪 AI 获胜！再接再厉！'}
                            </div>
                        </div>
                    )}
                </div>

                {/* 游戏设置 */}
                <div style={{
                    background: 'white',
                    borderRadius: '24px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    padding: '24px'
                }}>
                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        marginBottom: '24px',
                        color: '#1f2937',
                        margin: '0 0 24px 0'
                    }}>游戏设置</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #eff6ff 0%, #f3e8ff 100%)',
                            borderRadius: '16px',
                            padding: '16px'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '12px'
                            }}>
                                <span style={{ fontSize: '18px', fontWeight: '500', color: '#374151' }}>🎮 选择先手方</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button
                                    onClick={() => initGame(true)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        fontWeight: '500',
                                        border: playerStarts && !gameOver ? 'none' : '2px solid #c7d2fe',
                                        background: playerStarts && !gameOver ? '#4f46e5' : 'white',
                                        color: playerStarts && !gameOver ? 'white' : '#374151',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: playerStarts && !gameOver ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!playerStarts || gameOver) {
                                            e.currentTarget.style.borderColor = '#818cf8';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!playerStarts || gameOver) {
                                            e.currentTarget.style.borderColor = '#c7d2fe';
                                        }
                                    }}
                                >
                                    玩家先手 (X)
                                </button>
                                <button
                                    onClick={() => initGame(false)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        fontWeight: '500',
                                        border: !playerStarts && !gameOver ? 'none' : '2px solid #e9d5ff',
                                        background: !playerStarts && !gameOver ? '#9333ea' : 'white',
                                        color: !playerStarts && !gameOver ? 'white' : '#374151',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: !playerStarts && !gameOver ? '0 4px 12px rgba(147, 51, 234, 0.3)' : 'none'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (playerStarts || gameOver) {
                                            e.currentTarget.style.borderColor = '#c084fc';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (playerStarts || gameOver) {
                                            e.currentTarget.style.borderColor = '#e9d5ff';
                                        }
                                    }}
                                >
                                    AI 先手 (O)
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => initGame(playerStarts)}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                borderRadius: '16px',
                                fontWeight: 'bold',
                                fontSize: '18px',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.4)';
                            }}
                        >
                            🚀 开始新游戏
                        </button>
                    </div>

                    <div style={{
                        marginTop: '24px',
                        padding: '16px',
                        background: '#f9fafb',
                        borderRadius: '12px',
                        fontSize: '14px',
                        color: '#4b5563'
                    }}>
                        <p style={{ fontWeight: '500', marginBottom: '8px', margin: '0 0 8px 0' }}>游戏规则：</p>
                        <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <li>在15×15棋盘上对弈</li>
                            <li>先连成五子者获胜</li>
                            <li>可横、竖、斜连成五子</li>
                            <li>AI难度：专家级</li>
                        </ul>
                    </div>

                    <div style={{
                        marginTop: '16px',
                        padding: '16px',
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        borderRadius: '12px',
                        fontSize: '13px',
                        color: '#92400e',
                        border: '2px solid #fbbf24'
                    }}>
                        <p style={{ fontWeight: '600', marginBottom: '8px', margin: '0 0 8px 0' }}>💡 AI 特性：</p>
                        <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <li>威胁检测与应对</li>
                            <li>多步预判能力</li>
                            <li>棋型识别系统</li>
                            <li>启发式搜索优化</li>
                        </ul>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
        </div>
    );
}
