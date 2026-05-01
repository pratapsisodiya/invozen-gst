import { Button as PaperButton, ButtonProps as PaperButtonProps } from 'react-native-paper'

interface ButtonProps extends Omit<PaperButtonProps, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'text'
  children: string
}

export function Button({ variant = 'primary', children, ...props }: ButtonProps) {
  const getMode = () => {
    switch (variant) {
      case 'primary':
        return 'contained'
      case 'outline':
        return 'outlined'
      case 'text':
        return 'text'
      default:
        return 'contained'
    }
  }

  const getButtonColor = () => {
    if (variant === 'secondary') return '#6B7280'
    return '#7C3AED'
  }

  return (
    <PaperButton
      mode={getMode()}
      buttonColor={props.mode !== 'outlined' && props.mode !== 'text' ? getButtonColor() : undefined}
      textColor={variant === 'outline' || variant === 'text' ? '#7C3AED' : undefined}
      {...props}
    >
      {children}
    </PaperButton>
  )
}
