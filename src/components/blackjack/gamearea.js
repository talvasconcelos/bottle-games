import { h } from 'preact'
import { useContext } from 'preact/hooks'

import { store } from '../../routes/blackjack/store'


const GameArea = () => {    
    const globalState = useContext(store)
    const {dispatch} = globalState

    // dispatch({type: 'HELLO'})

    return (
        <div>
            <h1>Profile: </h1>
            <p>This is the user profile for a user named.</p>
            {JSON.stringify(globalState.shoe)}
            <div>Current time: </div>
        </div>
    )
}

export default  GameArea

