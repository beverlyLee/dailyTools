import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout } from 'antd'
import HomeView from './views/HomeView'
import AlbumView from './views/AlbumView'
import CelebrityView from './views/CelebrityView'
import Header from './components/Header'
import './App.css'

const { Content } = Layout

function App() {
  return (
    <Layout className="app-layout">
      <Header />
      <Content className="app-content">
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/album" element={<AlbumView />} />
          <Route path="/celebrity/:id" element={<CelebrityView />} />
        </Routes>
      </Content>
    </Layout>
  )
}

export default App
