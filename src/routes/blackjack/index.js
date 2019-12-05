import { h, Component } from 'preact'

import * as B from '../../lib/blackjack'

import Gamehand from '../../components/blackjack/gamehand'

const { BUST, WIN, LOSE, PUSH, BLACKJACK } = B.results

const DELAY = 750

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
        pot: 0,
        shoe: null,
        hands: null,
        activeHandIndex: null,
        isDealing: false,
        isSplit: false,
        canSplit: false,
        canDoubleDown: false
    }

    setStateSync = (stateUpdate) => {
        return new Promise(resolve => {
            this.setState(stateUpdate, resolve())
        })
    }

    get canSplit () {
        if(this.state.bank < this.state.settings.minimumBet) return false
        if(!this.state.hands.length || !this.state.activeHandIndex) return false
        if(this.state.hands.length > 2) return false
        const cards = this.state.hands[this.state.activeHandIndex].cards
        return cards.length === 2 && cards[0].value === cards[1].value 
    }

    get canDoubleDown () {
        if (this.state.bank < this.state.settings.minimumBet) return false
        if (!this.state.hands.length || !this.state.activeHandIndex) return false
        const cards = this.state.hands[this.state.activeHandIndex].cards
        return cards.length === 2
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
        this.setState({bank: this.state.bank - bet, pot: this.state.pot + bet})
        console.log(bet)
        return bet
    }

    handleAction = (e) => {
        e.preventDefault()
        e.preventDefault()
        const action = e.target.innerText.toLowerCase()
        console.log(action)
        switch (action) {
            case 'hit':
                this.hit()
                break;
            case 'stand':
                this.stand()
                break;
            case 'split':
                this.split()
                break;
            case 'double down':
                this.doubleDown()
                break;        
            default:
                break;
        }
    }

    hit = async (onlyOnce = false, isDealer = false) => {
        const active = this.state.activeHandIndex
        await this.deal(this.state.activeHandIndex)
        await this.checkForBustsAndBlackjacks()
        const isResult = this.state.hands[active].result ? true : false
        // !isDealer && console.debug('hit result', isResult, isDealer)
        if(isResult || onlyOnce) {
            !isDealer && console.log('#1', isResult, onlyOnce)
            return setTimeout(() => this.endTurn(), DELAY)
        }
        if(B.score(this.state.hands[active].cards) === 21) {
            !isDealer && console.log('#2')
            return setTimeout(() => this.endTurn(), DELAY)
        }
        if(isDealer) {
            console.log('#3')
            return setTimeout(() => this.makeDealerDecision(), DELAY)
        }
    }

    stand = () => {
        this.endTurn()
    }

    /*
    canSplit (state) {
    if (state.bank < state.settings.minimumBet) return false
    if (!state.hands.length || !state.activeHandIndex) return false
    if (state.hands.length > 2) return false
    const cards = state.hands[state.activeHandIndex].cards
    return cards.length === 2 && cards[0].value === cards[1].value
    },
    canDoubleDown (state) {
        if (state.bank < state.settings.minimumBet) return false
        if (!state.hands.length || !state.activeHandIndex) return false
        const cards = state.hands[state.activeHandIndex].cards
        return cards.length === 2
    },
    */

    split = () => {
        const hands = this.state.hands
        hands[2] = clone(BASE_HAND)
        hands[2].cards.push(hands[1].cards.pop())
        hands[2].bets[0] = this.bet()
        this.setState({hands, activeHandIndex: null, isSplit: true}, this.startNextTurn)
    }

    doubleDown = () => {
        const idx = this.state.activeHandIndex
        const hands = this.state.hands
        hands[idx].bets = [...hands[idx].bets, this.bet()]
        this.setState({hands}, () => this.hit(true))
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
            setTimeout(() => this.endRound(), DELAY)
        } else {
            setTimeout(() => this.startNextTurn(), DELAY)
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
        setTimeout(() => this.setState({hands, bank, activeHandIndex: null, pot: 0}, this.resetRound), DELAY * 2)
    }

    endTurn = () => {
        console.debug('end turn')
        if(this.state.activeHandIndex > 0) {
            setTimeout(() => this.startNextTurn(), DELAY)
        } else {
            setTimeout(() => this.endRound(), DELAY)
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
            setTimeout(() => this.revealDealerHand(), DELAY)
            setTimeout(() => this.makeDealerDecision(), DELAY)
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
        this.setState({hands: [clone(BASE_HAND), clone(BASE_HAND)], isSplit: false}, this.startNewGame)
    }

    componentDidMount = async () => {
        await this.setInitials()
        this.startNewGame()
    }

    render = ({}, {hands, bank, pot}) => {
        const getTotal = (hand) => {
            if (hand.cards.length < 2) return
            if (hand.cards.find(card => card.isFaceDown)) return
            return B.score(hand.cards)
        }

        return hands && (    
            <div class='blackjack'>
                <h1>Blackjack</h1>
                <div class='game-area'>
                    <section class='dealer'>
                        <Gamehand hand={hands[0]} total={getTotal(hands[0])} />
                    </section>
                    <section class={`player ${this.state.isSplit && 'isSplit'}`}>
                        <Gamehand hand={hands[1]} total={getTotal(hands[1])} />
                        {this.state.isSplit && <Gamehand hand={hands[2]} total={getTotal(hands[2])} />}
                    </section>
                </div>
                <div class='info'>
                    <p>{`Stack: ${bank}`}</p>
                    <p>{`Bet: ${pot}`}</p>
                </div>
                <div>
                    <button onClick={this.handleAction} disabled={!this.canDoubleDown}>Double Down</button>
                    <button onClick={this.handleAction} disabled={!this.canSplit}>Split</button>
                    <button onClick={this.handleAction}>Hit</button>
                    <button onClick={this.handleAction}>Stand</button>
                </div>
            </div>  
        )
    }
}