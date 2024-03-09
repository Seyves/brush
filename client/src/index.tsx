/* @refresh reload */
import { render } from 'solid-js/web'

import './index.css'
import App from './App'

const root = document.getElementById('root')

console.log("Server URL: ", import.meta.env.VITE_SERVER_URL)

render(() => <App />, root!)
