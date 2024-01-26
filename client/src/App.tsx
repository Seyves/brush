import { Show, createContext, createSignal, useContext } from 'solid-js'
import AuthScreen from './AuthScreen.tsx'
import MainScreen from './MainScreen.tsx'
import * as api from "./api.ts"

export type Credentials = {
    restClient: api.RestClient
    wsClient: api.WebsocketClient
    me: {
        name: string
        color: string
    }
}

const AppContext = createContext<Credentials>()

export function useAppContext() {
    const ctx = useContext(AppContext)

    if (!ctx) throw new Error("AppContext not found")

    return ctx
}

function App() {
    const [credentials, setCredentials] = createSignal<null | Credentials>(null)

    return (
        <Show
            when={credentials()}
            fallback={<AuthScreen setCredentials={setCredentials} />}
        >
            {(credentials) =>
                <AppContext.Provider value={credentials()}>
                    <MainScreen />
                </AppContext.Provider>
            }
        </Show>
    )
}

export default App
