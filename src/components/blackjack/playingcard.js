const PlayingCard = ({card, isFaceDown}) => (
	<>
		{/* <img class='card' src={`../assets/cards/${card.value}${card.suit}.svg`} alt={`${card.value}${card.suit}`} /> */}
        {isFaceDown
        ? <img class='card' src={`../assets/cards/1B.svg`} alt='Face Down'/> 
		: <img class='card' src={`../assets/cards/${card.value}${card.suit}.svg`} alt={`${card.value}${card.suit}`} />}
	</>
)

export default PlayingCard