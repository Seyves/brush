import { Accessor, Setter } from "solid-js"

interface Props {
    auth: (name: string) => void
    name: Accessor<string>
    setName: Setter<string>
}

export default function AuthScreen(props: Props) {
    function onSubmit(event: Event) {
        event.preventDefault()

        props.auth(props.name())
    }

    return (
        <div class="screen" id="auth-screen">
            <form id="auth-form" onSubmit={onSubmit}>
                <label>Please input your name</label>
                <input type="text" onChange={(e) => props.setName(e.currentTarget.value)} />
                <button>Sign In</button>
            </form>
        </div>
    )
}
