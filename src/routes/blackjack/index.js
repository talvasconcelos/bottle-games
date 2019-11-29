import { h, Component } from 'preact'
import style from './style'

import * as B from '../../lib/blackjack'

const { BUST, WIN, LOSE, PUSH, BLACKJACK } = B.results

const BASE_HAND = {
  cards: [],
  result: undefined,
  bets: []
}

const clone = obj => JSON.parse(JSON.stringify(obj))

export default class Blackjack extends Component {

    state = {
        isTitleShowing: true,
        settings: {
            deckCount: 6,
            startingBank: this.props.balance,
            shuffleAfterPercent: 0.75,
            minimumBet: this.props.bet
        },
        bank: 0,
        shoe: null,
        hands: null,
        activeHandIndex: null,
        isDealing: false
    }

    setStateSync = (stateUpdate) => {
        return new Promise(resolve => {
            this.setState(stateUpdate, resolve())
        })
    }

    resetShoe = () => {
        const c = this.state.settings
        let shoe = B.createShoe(c.deckCount)
        shoe = B.shuffle(shoe)
        return shoe
    }

    advanceActiveHand = async () => {
        if(this.state.activeHandIndex > 0){
            await this.setStateSync({activeHandIndex: this.state.activeHandIndex - 1})
        }
        if(this.state.activeHandIndex === null) {
            await this.setStateSync({activeHandIndex: this.state.hands.length - 1})
        }
    }

    checkForBustsAndBlackjacks = async () => {
        const hands = this.state.hands
        for (let i = 0; i < hands.length; i++) {
            const hand = hands[i]
            const total = B.score(hand.cards)
            if (total > 21) hand.result = BUST
            if (total === 21 && hand.cards.length === 2) {
              hand.result = BLACKJACK
            }
            if (i > 0 && hands[0].result === BLACKJACK) {
              if (hand.result === BLACKJACK) hand.result = PUSH
              if (!hand.result) hand.result = LOSE
            }
        }
        await this.setStateSync({hands: hands})
    }

    bet = () => {
        const c = this.state.settings
        if(this.state.bank < c.minimumBet) return
        const bet = [c.minimumBet]
        console.log(bet)
        return bet
    }

    deal = async (deal) => {
        const hands = this.state.hands.slice()
        const shoe = this.state.shoe.slice()
        let newCard = shoe.shift()
        const isFirstDealerCard = deal === 0 && hands[deal].cards.length === 0
        newCard.isFaceDown = isFirstDealerCard
        hands[deal].cards = [...hands[deal].cards, newCard]
        // console.log('newCard', newCard)
        await this.setStateSync({
            hands: hands,
            shoe: shoe
        })
    }

    dealRound = async () => {
        if(!this.state.hands[1].bets[0]) return
        const dealQueue = [1, 0, 1, 0]
        for (const handIndex of dealQueue) {
            await this.deal(handIndex)
        }
        setTimeout(() => this.startRound(), 300)
    }

    startNewGame = async () => {
        const hands = this.state.hands
        hands[1].bets = hands[1].bets.concat(this.bet())
        this.setState({hands: hands}, this.dealRound)
    }

    startRound = async () => {
        await this.checkForBustsAndBlackjacks()
        if(this.state.hands.find(hand => hand.result)){
            this.revealDealerHand()
            this.endRound()
        } else {
            this.startNextTurn()
        }
    }

    startNextTurn = async () => {
        await this.advanceActiveHand()
        console.log(this.state)
        // const activeHand = this.state.hands[this.state.activeHandIndex]
        // if(activeHand.cards.length === 1){
        //     let onlyOnce = activeHand.cards[0].value === 'A'
        //     this.hit(onlyOnce)
        // }
        // if(this.state.activeHandIndex === 0){            
        //     this.revealDealerHand()
        //     this.makeDealerDecision()
        // }
    }

    setInitials = async () => {
        await this.setStateSync({
            shoe: this.resetShoe(),
            bank: this.state.settings.startingBank,
            hands: [clone(BASE_HAND), clone(BASE_HAND)]
        })
    }
    
    componentDidMount = async () => {
        await this.setInitials()
        this.startNewGame()
    }


    render = ({}, {shoe}) => {
        return (        
            <div class={style.profile}>
                <h1>Profile: </h1>
                <p>This is the user profile for a user named.</p>
                {JSON.stringify(shoe)}
                <div>Current time: </div>
            </div>        
        )
    }
}