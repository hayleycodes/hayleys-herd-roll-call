import { useState } from 'react';
import './App.css';
import { mainPenPigList, smallPensPigList } from './pigs';
import PigList from './PigList/PigList';

interface PigListItem {
    name: string;
    checked: boolean;
}

function App() {
    const [orderedMainPenPigList, setOrderedMainPenPigList] = useState(
        mainPenPigList.map((pig) => {
            return { name: pig, checked: false };
        })
    );

    const [orderedSmallPenPigList, setOrderedSmallPenPigList] = useState(
        smallPensPigList.map((pig) => {
            return { name: pig, checked: false };
        })
    );

    const togglePigCheckedStatus = (
        name: string,
        prevPigList: PigListItem[]
    ) => {
        const updated = prevPigList.map((pig) =>
            pig.name === name ? { ...pig, checked: !pig.checked } : pig
        );
        return updated.sort((a, b) => Number(a.checked) - Number(b.checked));
    };

    const togglePig = (name: string) => {
        const updater = (prev: PigListItem[]) =>
            togglePigCheckedStatus(name, prev);

        setOrderedMainPenPigList(updater);
        setOrderedSmallPenPigList(updater);
    };

    return (
        <div>
            <section id="main-pen">
                <h2>Main Pen</h2>
                <PigList
                    pigs={orderedMainPenPigList}
                    pen="main"
                    onToggle={togglePig}
                />
            </section>

            <section id="small-pen">
                <h2>Small Pens</h2>
                <PigList
                    pigs={orderedSmallPenPigList}
                    pen="small"
                    onToggle={togglePig}
                />
            </section>
        </div>
    );
}

export default App;
