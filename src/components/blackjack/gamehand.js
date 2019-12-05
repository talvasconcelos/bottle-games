import PlayingCard from './playingcard'

const GameHand = ({hand, total}) => {
	return (<div class='game-hand'>
		<div class='cards'>
        	{hand.cards.length && hand.cards.map(c => (<PlayingCard card={c} isFaceDown={c.isFaceDown} />) )}
		</div>
		{total && <span class='score'>{total}</span>}
	</div>)
}

export default GameHand