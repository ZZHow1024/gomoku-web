import 'tdesign-react/es/style/index.css'
import { Layout, Tabs } from 'tdesign-react'
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom'
import Game from './pages/Game.tsx'
import Demo from './pages/Demo.tsx'
import Video from './pages/Video.tsx'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  // 当前激活菜单基于路由路径
  const active = location.pathname === '/' ? '/game' : location.pathname

  const onMenuChange = (value: string) => {
    if (value && value !== location.pathname) {
      navigate(value)
    }
  }

  return (
    <Layout>
      <Layout.Header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 16px' }}>
          <span style={{ fontWeight: 600 }}>MCTS 算法演示</span>
          <div style={{ flex: 1 }}>
            <Tabs value={active} onChange={(v) => onMenuChange(String(v))} placement="top">
              <Tabs.TabPanel value="/game" label="井字棋对弈" />
              <Tabs.TabPanel value="/demo" label="算法演示" />
              <Tabs.TabPanel value="/video" label="视频介绍" />
            </Tabs>
          </div>
        </div>
      </Layout.Header>
      <Layout.Content>
        <Routes>
          <Route path="/" element={<Navigate to="/game" replace />} />
          <Route path="/game" element={<Game />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/video" element={<Video />} />
          <Route path="*" element={<Navigate to="/game" replace />} />
        </Routes>
      </Layout.Content>
    </Layout>
  )
}

export default App
