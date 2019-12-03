const Button = ({action, ...props}) => (
    <button class='button' onClick={action}>{props.children}</button>
)

export default Button