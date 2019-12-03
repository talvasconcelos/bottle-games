import PlayingCard from './playingcard'

const GameHand = ({hand, total}) => {
	return (<div class='game-hand'>		
		{/* <span>{total}</span> */}
        {hand.cards.length > 0 && hand.cards.map(c => (<PlayingCard card={c} isFaceDown={c.isFaceDown} />) )}
	</div>)
}

export default GameHand