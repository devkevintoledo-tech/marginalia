import React, { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'

const Home = React.lazy(() => import('./pages/Home'))
const Book = React.lazy(() => import('./pages/Book'))
const Thread = React.lazy(() => import('./pages/Thread'))
const Genre = React.lazy(() => import('./pages/Genre'))
const Search = React.lazy(() => import('./pages/Search'))
const Profile = React.lazy(() => import('./pages/Profile'))
const Login = React.lazy(() => import('./pages/Login'))
const Register = React.lazy(() => import('./pages/Register'))

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />
      <Suspense fallback={<div className="flex items-center justify-center h-64 text-zinc-500">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/books/:id" element={<Book />} />
          <Route path="/books/:id/threads/:threadId" element={<Thread />} />
          <Route path="/genres/:slug" element={<Genre />} />
          <Route path="/search" element={<Search />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </Suspense>
    </div>
  )
}

export default App
