import { h, Component } from 'preact'
// import { useContext } from 'preact/hooks'

import blackjack from '../lib/blackjack'
// import { store } from '../store/store'
import GameHand from './gamehand'
import Controls from './controls'

const { BUST, WIN, LOSE, PUSH, BLACKJACK } = blackjack.results

const BASE_HAND = {
  cards: [],
  result: undefined,
  bets: []
}

const clone = obj => JSON.parse(JSON.stringify(obj))
 
export default class Game extends Component {

    state = /*useContext(store)*/{
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

    bet = async () => {
        const c = this.state.settings
        console.log('bank:', this.state.bank, c.minimumBet)
        if(this.state.bank < c.minimumBet) return
        const bet = [c.minimumBet]
        console.log('BET:', bet)
        const hands = [...this.state.hands]
        hands[1].bets = bet
        await this.setState(prevState => ({
                bank: prevState.bank - c.minimumBet,
                hands: hands
            })
        )
    }
    
    resetShoe = async () => {
        const c = this.state.settings
        let shoe = blackjack.createShoe(c.deckCount)
        shoe = blackjack.shuffle(shoe)
        await this.setState({shoe})
    }

    resetBank = () => {
        this.setState(prevState => ({bank: prevState.settings.startingBank}))
    }

    resetRound = async () => {
        await this.resetHands()
        await this.reshuffleIfNeeded()
        await this.bet()
        await this.dealRound()
        console.log('hands', this.state.hands)
    }

    resetHands = async () => {
        await this.setState(() => ({hands: [clone(BASE_HAND), clone(BASE_HAND)]}))
        console.log('reset hands', this.state.hands)
    }

    resetActiveHand = () => {
        this.setState({activeHandIndex: null})
    }

    compareHands = () => {
        const hands = clone(this.state.hands)
        for (let i = 1; i < hands.length; i++) {
            const hand = hands[i]
            const total = blackjack.score(hand.cards)
            const dealerTotal = blackjack.score(hands[0].cards)
            if (dealerTotal === total) hand.result = PUSH
            if (dealerTotal > 21 && !hand.result) hand.result = WIN
            if (total > dealerTotal && !hand.result) hand.result = WIN
            if (dealerTotal > total && !hand.result) hand.result = LOSE
        }
        this.setState(() => ({hands}))
    }

    settleHands = () => {
        const hands = clone(this.state.hands)
        for (const hand of hands) {
            if (hand.result === BLACKJACK) {
              hand.bets = Array(3).fill(hand.bets[0])
            }
            if (hand.result === WIN) hand.bets.push(...hand.bets)
            if ([LOSE, BUST].includes(hand.result)) hand.bets = []            
        }
        this.setState(() => ({hands}))
    }

    collectWinnings = () => {
        const hands = clone(this.state.hands)
        for (const hand of hands) {
            const winnings = hand.bets.reduce((a, b) => a + b, 0)
            this.setState(prevState => ({bank: prevState.bank + winnings}))
            hand.bets = []
        }
        this.setState(() => ({hands}))
    }

    reshuffleIfNeeded = () => {
        const c = this.state.settings
        const shoeUsedPercent = 1 - (this.state.shoe.length / (c.deckCount * 52))
        if (shoeUsedPercent >= c.shuffleAfterPercent) {
          this.resetShoe()
        }
    }

    deal = (deal) => {
        const hands = this.state.hands.slice()
        const shoe = this.state.shoe.slice()
        let newCard = shoe.shift()
        const isFirstDealerCard = deal === 0 && hands[deal].cards.length === 0
        newCard.isFaceDown = isFirstDealerCard
        hands[deal].cards = [...hands[deal].cards, newCard]
        // console.log('newCard', newCard)
        this.setState({
            hands: hands,
            shoe: shoe
        })
    }

    dealRound = async () => {
        if(!this.state.hands[1].bets[0]) return
        const dealQueue = [1, 0, 1, 0]
        for (const handIndex of dealQueue) {
            setTimeout(() => this.deal(handIndex), 500)
        }
        await setTimeout(() => this.startRound(), 500 * 5)
    }

    total = (idx) => {
        const hand = this.state.hands[idx]
        if(hand.cards.length < 2) return
        if(hand.cards.find(card => card.isFaceDown)) return
        return blackjack.score(hand.cards)
    }

    checkForBustsAndBlackjacks = () => {
        this.setState(() => {
            const hands = clone(this.state.hands)
            for (let i = 0; i < hands.length; i++) {
                const hand = hands[i]
                const total = blackjack.score(hand.cards)
                if (total > 21) hand.result = BUST
                if (total === 21 && hand.cards.length === 2) {
                  hand.result = BLACKJACK
                }
                if (i > 0 && hands[0].result === BLACKJACK) {
                  if (hand.result === BLACKJACK) hand.result = PUSH
                  if (!hand.result) hand.result = LOSE
                }
            }
            console.log('check', blackjack.score(this.state.hands[1].cards))
            // for (const [i, hand] of hands.entries()) {
            //     const total = blackjack.score(hand.cards)
            //     console.log('Check Score:', total)
            //     if (total > 21) hand.result = BUST
            //     if (total === 21 && hand.cards.length === 2) {
            //       hand.result = BLACKJACK
            //     }
            //     if (i > 0 && hands[0].result === BLACKJACK) {
            //       if (hand.result === BLACKJACK) hand.result = PUSH
            //       if (!hand.result) hand.result = LOSE
            //     }
            // }
            return {hands: hands}
        })
        // console.log('check', this.state.hands)
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

    revealDealerHand = () => {
        this.setState(() => {
            const hands = this.state.hands
            hands[0].cards[0].isFaceDown = false
            return {hands}
        })
    }

    advanceActiveHand = async () => {
        if(this.state.activeHandIndex > 0){
            await this.setState(prevState => ({activeHandIndex: prevState.activeHandIndex - 1}))
        }
        if(this.state.activeHandIndex === null) {
            await this.setState(prevState => ({activeHandIndex: prevState.hands.length - 1}))
        }
    }

    endRound = () => {
        this.resetActiveHand()
        this.compareHands()
        setTimeout(() => this.settleHands(), 500 * 1.5)
        setTimeout(() => this.collectWinnings(), 500 * 3.5)
        setTimeout(() => this.resetRound(), 500 * 4)
    }

    startNextTurn = async () => {
        await this.advanceActiveHand()
        const activeHand = this.state.hands[this.state.activeHandIndex]
        if(activeHand.cards.length === 1){
            let onlyOnce = activeHand.cards[0].value === 'A'
            setTimeout(() => this.hit(onlyOnce), 500)
        }
        if(this.state.activeHandIndex === 0){
            setTimeout(() => {
                this.revealDealerHand()
                setTimeout(() => this.makeDealerDecision(), 750)
            }, 500)
        }
    }

    endTurn = () => {
        if(this.state.activeHandIndex > 0) {
            this.startNextTurn()
        } else {
            this.endRound()
        }
    }

    get dealerTotal() {
        if(!this.state.hands.length) return
        return blackjack.score(this.state.hands[0].cards)
    }

    makeDealerDecision = () => {
        const remainingHands = this.state.hands.find((hand, i) => !hand.result && i > 0)
        if(this.dealerTotal < 17 && remainingHands) {
            this.hit(false, true)
        } else {
            this.stand()
        }
    }

    hit = async (onlyOnce = false, isDealer = false) => {
        const activeHand = this.state.activeHandIndex
        this.setState({isDealing: true})
        this.deal(activeHand)        
        this.checkForBustsAndBlackjacks()
        const result = this.state.hands[activeHand].result ? true : false
        const isEndTurn = (result || onlyOnce)
        const isBlackjack = blackjack.score(this.state.hands[activeHand].cards) === 21
        console.log(isEndTurn, isBlackjack, isDealer)
        this.setState({isDealing: false})
        if(isEndTurn) return this.endTurn()
        if(isBlackjack) return this.endTurn()
        if(isDealer) this.makeDealerDecision()
        
    }

    stand = () => {
        this.endTurn()
    }

    split = () => {
        this.doSplit()
        this.resetActiveHand()
        setTimeout(() => this.startNextTurn(), 500 * 2)
    }

    doubleDown = () => {
        this.setState(() => ({isDealing: true}))
        this.doubleBet()
        setTimeout(() => this.hit(true), 500)
    }

    doubleBet = () => {
        this.setState(prevState => {
            const bets = prevState.hands[prevState.activeHandIndex].bets
            bets[1] = bets[0]
            return {hands: [...prevState.hands, prevState.hands[prevState.activeHandIndex].bets = bets]}
        })
        console.log(this.state.hands)
    }

    doSplit = () => {
        this.setState(prevState => {
            const hands = prevState.hands.slice()
            hands[2] = clone(BASE_HAND)
            hands[2].cards.push(hands[1].cards.pop())
            hands[2].bets[0] = hands[1].bets[0]
            return {bank: prevState.bank - hands[2].bets[0], hands}
        })
    }

    componentDidMount = () => {
        this.resetShoe()
        this.resetBank()
        this.resetRound()
    }

	render({}, {hands}) {
        // const scoreDealer = hands && this.total(0)
        // const scorePlayer = hands && this.total(1)
		return (
            <div class='game-area'>
                <section class='dealer'>
                    <h3>Dealer's Hand</h3>
                    {hands && <GameHand hand={hands[0]} total={10} />}
                </section>
                <div class='pot'>
                    <h3>{`Balance:`}</h3>
                </div>
                <section class='player'>
                    <h3>Your Hand</h3>
                    {hands && <GameHand hand={hands[1]} total={10} />}
                    <Controls 
                        hit={this.hit}
                        stand={this.stand} 
                        split={this.split}
                        ddown={this.doubleDown}
                    />
                </section>
            </div>
		)
	}
}