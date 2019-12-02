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

    reshuffleIfNeeded = async () => {
        const c = this.state.settings
        const shoeUsedPercent = 1 - (this.state.shoe.length / (c.deckCount * 52))
        if (shoeUsedPercent >= c.shuffleAfterPercent) {
            await this.setStateSync({shoe: this.resetShoe()})
        }
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
        const hands = clone(this.state.hands)
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
            console.log(total)
        }
        await this.setStateSync({hands: hands})
    }

    bet = () => {
        const c = this.state.settings
        if(this.state.bank < c.minimumBet) return
        const bet = c.minimumBet
        this.setState({bank: this.state.bank - bet})
        console.log(bet)
        return bet
    }

    handleAction = () => {
        this.hit()
    }

    hit = async (onlyOnce = false, isDealer = false) => {
        const active = this.state.activeHandIndex
        await this.deal(this.state.activeHandIndex)
        await this.checkForBustsAndBlackjacks()
        const isResult = this.state.hands[active].result ? true : false
        // !isDealer && console.debug('hit result', isResult, isDealer)
        if(isResult || onlyOnce) {
            !isDealer && console.log('#1', isResult, onlyOnce)
            return this.endTurn()
        }
        if(B.score(this.state.hands[active].cards) === 21) {
            !isDealer && console.log('#2')
            return this.endTurn()
        }
        if(isDealer) {
            console.log('#3')
            return this.makeDealerDecision()
        }
    }

    stand = () => {
        this.endTurn()
    }

    deal = async (deal) => {
        const hands = this.state.hands
        const shoe = this.state.shoe
        let newCard = shoe.shift()
        // console.debug('Deal Card:', newCard)
        const isFirstDealerCard = deal === 0 && hands[deal].cards.length === 0
        newCard.isFaceDown = isFirstDealerCard
        hands[deal].cards = [...hands[deal].cards, newCard]
        await this.setStateSync({
            hands: hands,
            shoe: shoe
        })
    }

    dealRound = async () => {
        console.debug('dealRound')
        if(!this.state.hands[1].bets[0]) return
        const dealQueue = [1, 0, 1, 0]
        for (const handIndex of dealQueue) {
            try {
                await this.deal(handIndex)
            } catch (err) {
                console.error(err)
            }
        }
        setTimeout(() => this.startRound(), 300)
    }

    startNewGame = () => {
        const hands = this.state.hands
        hands[1].bets = [...hands[1].bets, this.bet()]

        this.setState({hands: hands}, this.dealRound)
    }

    revealDealerHand = async () => {
        const hands = this.state.hands
        hands[0].cards[0].isFaceDown = false
        await this.setStateSync({hands})
    }

    dealerTotal = () => {
        if(!this.state.hands.length) return
        return B.score(this.state.hands[0].cards)
    }

    makeDealerDecision = () => {
        const remainingHands = this.state.hands.find((hand, i) => !hand.result && i > 0)
        const dealerTotal = this.dealerTotal()
        console.log('dealer decision', dealerTotal)
        if(dealerTotal < 17 && remainingHands) {
            this.hit(false, true)
        } else {
            this.stand()
        }
    }

    startRound = async () => {
        console.log('Start Round')
        await this.checkForBustsAndBlackjacks()
        if(this.state.hands.find(hand => hand.result)){
            await this.revealDealerHand()
            this.endRound()
        } else {
            this.startNextTurn()
        }
    }

    endRound = () => {
        console.debug('endRound')
        this.setState({activeHandIndex: null}, this.compareHands)
    }

    
    compareHands = () => {
        const hands = this.state.hands
        for (let i = 1; i < hands.length; i++) {
            const hand = hands[i]
            const total = B.score(hand.cards)
            const dealerTotal = B.score(hands[0].cards)
            if (dealerTotal === total) hand.result = PUSH
            if (dealerTotal > 21 && !hand.result) hand.result = WIN
            if (total > dealerTotal && !hand.result) hand.result = WIN
            if (dealerTotal > total && !hand.result) hand.result = LOSE
        }
        this.settleHands(hands)
    }
    
    settleHands = (hands) => {
        for (let i = 1; i < hands.length; i++) {
            const hand = hands[i]
            if (hand.result === BLACKJACK) {
                hand.bets = Array(3).fill(hand.bets[0])
            }
            if (hand.result === WIN) hand.bets.push(...hand.bets)
            if ([LOSE, BUST].includes(hand.result)) hand.bets = []
        }
        this.collectWinnings(hands)
    }
    
    collectWinnings = async (hands) => {
        let bank = this.state.bank
        for (let i = 1; i < hands.length; i++) {
            const hand = hands[i]
            const winnings = hand.bets.reduce((a, b) => a + b, 0)
            console.debug('collect', hand, winnings)
            bank += winnings
            // await this.setStateSync({bank: this.state.bank + winnings})
            hand.bets = []
        }
        this.setState({hands, bank, activeHandIndex: null}, this.resetRound)
    }
    
    endTurn = () => {
        console.debug('end turn')
        if(this.state.activeHandIndex > 0) {
            this.startNextTurn()
        } else {
            this.endRound()
        }
    }
    
    startNextTurn = async () => {
        await this.advanceActiveHand()
        const activeHand = this.state.hands[this.state.activeHandIndex]
        if(activeHand.cards.length === 1){
            let onlyOnce = activeHand.cards[0].value === 'A'
            this.hit(onlyOnce)
        }
        if(this.state.activeHandIndex === 0){            
            this.revealDealerHand()
            this.makeDealerDecision()
        }
        console.log('start next turn', this.state)
    }
    
    setInitials = async () => {
        await this.setStateSync({
            shoe: this.resetShoe(),
            bank: this.state.settings.startingBank,
            hands: [clone(BASE_HAND), clone(BASE_HAND)]
        })
    }
    
    resetRound = async () => {
        console.debug('resetRound')
        await this.reshuffleIfNeeded()
        this.setState({hands: [clone(BASE_HAND), clone(BASE_HAND)]}, this.startNewGame)
    }

    componentDidMount = async () => {
        await this.setInitials()
        this.startNewGame()
    }


    render = ({}, {hands, shoe}) => {
        return (        
            <div class={style.profile}>
                <h1>Profile: </h1>
                <p>This is the user profile for a user named.</p>
                {hands && JSON.stringify(hands[1].cards)}
                <div>Current time: </div>
                <div>
                    <button onClick={this.hit}>hit</button>
                    <button onClick={this.stand}>stand</button>
                </div>
            </div>        
        )
    }
}