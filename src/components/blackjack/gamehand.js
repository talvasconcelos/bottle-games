import PlayingCard from './playingcard'

const GameHand = ({hand, total}) => {
	return (<div class='game-hand'>
        {hand.cards.length > 0 && hand.cards.map(c => (<PlayingCard card={c} isFaceDown={c.isFaceDown} />) )}
		<span class='score'>{total}</span>
	</div>)
}

export default GameHand