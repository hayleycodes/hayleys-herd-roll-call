interface PigListItem {
    name: string;
    checked: boolean;
}

interface PigListProps {
    pigs: PigListItem[];
    pen: string;
    onToggle: (name: string) => void;
}

function PigList({ pigs, pen, onToggle }: PigListProps) {
    return (
        <ul id={`${pen}-list`}>
            {pigs.map((pig) => (
                <li key={pig.name}>
                    <div>
                        <input
                            type="checkbox"
                            id={pig.name}
                            value={pig.name}
                            checked={pig.checked}
                            onChange={() => onToggle(pig.name)}
                        />
                        <label htmlFor={pig.name}>{pig.name}</label>
                    </div>
                </li>
            ))}
        </ul>
    );
}

export default PigList;
