import { createContext } from 'preact'
import { useReducer } from 'preact/hooks'

import mutations from './mutations'

const initialState = {
    isTitleShowing: true,
    settings: {
        deckCount: 6,
        startingBank: 10000,
        shuffleAfterPercent: 0.75,
        minimumBet: 50
    },
    bank: 0,
    shoe: null,
    hands: null,
    activeHandIndex: null,
    isDealing: false
}

const store = createContext(initialState)

const { Provider } = store

const StateProvider = ({children}) => {
    const [state, dispatch] = useReducer((state, action) => {
      switch(action.type) {
          case '':
              return newState
          case 'HELLO':
                  const newShoe = {...state, shoe: mutations.resetShoe(state)}
                  console.log(newShoe)
                  return newShoe
          default:
              throw new Error()
      }
    }, initialState)

    return <Provider value={{state, dispatch}}>{children}</Provider>
}

export {store, StateProvider}