export const mockFileContent = new Map<string, string>()

// We only need to add content for the 'fileNode' types
mockFileContent.set('pkg-json',
    `{
  "name": "reporeader-ai-client",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}`)

mockFileContent.set('app-tsx',
    `import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`)

mockFileContent.set('button-tsx',
    `import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary'
}

export const Button = ({ children, variant, ...props }: ButtonProps) => {
  const baseStyle = 'px-4 py-2 rounded-md font-bold'
  
  const styles = {
    primary: 'bg-blue-500 text-white',
    secondary: 'bg-gray-500 text-white',
  }

  return (
    <button 
      className={\`\${baseStyle} \${styles[variant]}\`}
      {...props}
    >
      {children}
    </button>
  )
}
`)

mockFileContent.set('auth-index',
    `import { express } from 'express'
const router = express.Router()

// Mock sign-up route
router.post('/signup', (req, res) => {
  const { email, password } = req.body
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }
  
  // Logic to create a new user would go here
  // ...
  
  console.log('User created:', email)
  res.status(201).json({ message: 'User created successfully' })
})

// Mock sign-in route
router.post('/signin', (req, res) => {
  // ...
})

export default router
`)