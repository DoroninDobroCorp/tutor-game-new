import { FC } from 'react';
type SpinnerSize = 'sm' | 'md' | 'lg';
interface SpinnerProps {
    size?: SpinnerSize;
    className?: string;
}
declare const Spinner: FC<SpinnerProps>;
export default Spinner;
