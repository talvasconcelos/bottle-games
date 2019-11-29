import * as blackjack from '../../lib/blackjack'

export default {
    resetShoe(state) {
        state.shoe = blackjack.createShoe(state.settings.deckCount)
        state.shoe = blackjack.shuffle(state.shoe)
        return state.shoe
    }
}