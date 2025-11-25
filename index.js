const girls = [
    'Hazelnut',
    'Chestnut',
    'Oreo',
    'Cookie',
    'Honey',
    'Banana',
    'Banana Brown-Foot',
    'Ginger',
    'Pumpkin',
    'Meatball',
    'Starbuck',
    'Crouton',
    'Crumb',
    'Honeydew',
    'Melon',
    'Beans',
    'Nacho',
    'Maple',
    'Crumpet',
    'Chai',
    'Pineapple',
    'Stylish Pig',
    'Spice',
    'Waffle',
    'Fish',
    'Muffin',
    'Raisin',
    'Cherry',
    'Potato',
    'Toast',
];

const boys = ['Spud', 'Pie', 'Tornado Pig'];

const generatePigListElements = (pigs) => {
    return pigs.map((pig) => {
        // Create the wrapper li
        const li = document.createElement('li');
        li.className = 'pig';

        const innerDiv = document.createElement('div');
        innerDiv.className = 'innerPig';

        // Create the input
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = pig;
        input.value = pig;

        // Create the label
        const label = document.createElement('label');
        label.htmlFor = pig;
        label.textContent = pig;

        // Append elements
        innerDiv.appendChild(input);
        innerDiv.appendChild(label);
        li.appendChild(innerDiv);
        return li;
    });
};

const generatePigList = (listId, pigs) => {
    const penList = document.getElementById(listId);
    const pigListElements = generatePigListElements(pigs);

    pigListElements.forEach((li) => penList.appendChild(li));
};

generatePigList('girls-list', girls);
generatePigList('boys-list', boys);

document.addEventListener('change', (event) => {
    if (event.target.type !== 'checkbox') return;
    const li = event.target.closest('li');
    const ul = li.parentNode;

    const items = [...ul.children];
    const checkedItems = items.filter(
        (item) => item.querySelector('input').checked
    );

    if (event.target.checked) {
        ul.appendChild(li);
    } else {
        const firstChecked = checkedItems[0];
        if (firstChecked) {
            ul.insertBefore(li, firstChecked);
        } else {
            ul.insertBefore(li, ul.firstChild);
        }
    }
});
