
import React from "react"
import MainMenu from "@/components/MainMenu"

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="w-full py-4 px-6 flex items-center justify-between shadow-md bg-card/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <img src="/logo.svg" alt="Poligon Logo" className="h-12 w-12" />
          <span className="font-playfair text-3xl font-bold tracking-tight">Poligon</span>
        </div>
        <MainMenu />
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <h1 className="font-playfair text-4xl font-bold mb-4">Welcome to Poligon</h1>
        <p className="font-source text-lg text-muted-foreground mb-8">This is the starting point for your professional frontend using Shadcn UI.</p>
        {/* Add more home page content here */}
      </main>
    </div>
  )
}

export default App