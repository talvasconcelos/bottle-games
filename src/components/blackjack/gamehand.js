import PlayingCard from './playingcard'

const GameHand = ({hand, total, dim}) => {
	return (<div class='game-hand'>
		<div class={`cards ${dim ? 'dimmed' : ''}`}>
        	{hand.cards.length && hand.cards.map(c => (<PlayingCard card={c} isFaceDown={c.isFaceDown} />) )}
			{total && <span class='score'>{total}</span>}
		</div>
	</div>)
}

export default GameHand