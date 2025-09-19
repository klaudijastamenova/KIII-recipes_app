import React, { useEffect, useState } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

function App() {
    const [recipes, setRecipes] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showFavorites, setShowFavorites] = useState(false);
    const [allIngredients, setAllIngredients] = useState([]);
    const [selectedIngredients, setSelectedIngredients] = useState([]);
    const [newRecipe, setNewRecipe] = useState({
        title: '',
        instructions: '',
        ingredients: [{ name: '', quantity: '' }],
        category: ''
    });
    const [favorites, setFavorites] = useState([]);

    const categories = [
        { id: 'Салати', name: 'Салати', icon: '🥗' },
        { id: 'Главно јадење', name: 'Главно јадење', icon: '🍲' },
        { id: 'Десерти', name: 'Десерти', icon: '🍰' }
    ];

    const saveFavoritesToStorage = (favorites) => {
        try {
            localStorage.setItem('favorites', JSON.stringify(favorites));
            sessionStorage.setItem('favorites_backup', JSON.stringify(favorites));
        } catch (error) {
            console.error('Error saving favorites to localStorage:', error);
            try {
                sessionStorage.setItem('favorites_backup', JSON.stringify(favorites));
            } catch (sessionError) {
                console.error('Error saving favorites to sessionStorage:', sessionError);
            }
        }
    };

    const loadFavoritesFromStorage = () => {
        try {
            const saved = localStorage.getItem('favorites');
            if (saved) {
                return JSON.parse(saved);
            }

            const backup = sessionStorage.getItem('favorites_backup');
            if (backup) {
                const parsed = JSON.parse(backup);
                localStorage.setItem('favorites', backup);
                return parsed;
            }
        } catch (error) {
            console.error('Error loading favorites from storage:', error);
        }

        return [];
    };

    const validateAndCleanFavorites = async (favorites) => {
        if (!favorites || favorites.length === 0) {
            return [];
        }

        try {
            const validatedFavorites = [];

            for (const favorite of favorites) {
                try {
                    if (favorite && favorite.id && favorite.title && favorite.instructions && favorite.ingredients) {
                        validatedFavorites.push(favorite);
                    } else {
                        console.log(`Invalid recipe structure for favorite ${favorite?.id}, removing from favorites`);
                    }
                } catch (error) {
                    console.error(`Error validating recipe ${favorite.id}:`, error);
                    validatedFavorites.push(favorite);
                }
            }

            return validatedFavorites;
        } catch (error) {
            console.error('Error validating favorites:', error);
            return favorites;
        }
    };

    const fetchRecipes = (category = '', ingredients = []) => {
        let url = `${API_BASE_URL}/recipes`;
        if (category) url += `?category=${category}`;
        if (ingredients.length > 0) url += `${category ? '&' : '?'}ingredient=${ingredients.join(',')}`;

        fetch(url)
            .then(res => res.json())
            .then(data => setRecipes(data))
            .catch(err => console.error('Error fetching recipes:', err));
    };

    const fetchIngredients = () => {
        fetch(`${API_BASE_URL}/recipes/ingredients`)
            .then(res => res.json())
            .then(data => setAllIngredients(data))
            .catch(err => console.error('Error fetching ingredients:', err));
    };

    const toggleIngredients = (id) => {
        setRecipes(recipes.map(r =>
            r.id === id ? { ...r, showIngredients: !r.showIngredients } : r
        ));
    };

    const deleteRecipe = (id) => {
        if (window.confirm('Дали сте сигурни дека сакате да го избришете овој рецепт?')) {
            fetch(`${API_BASE_URL}/recipes/${id}`, { method: 'DELETE' })
                .then(() => {
                    fetchRecipes(selectedCategory, selectedIngredients);
                    const updatedFavorites = favorites.filter(f => f.id !== id);
                    if (updatedFavorites.length !== favorites.length) {
                        setFavorites(updatedFavorites);
                        saveFavoritesToStorage(updatedFavorites);
                    }
                })
                .catch(err => console.error('Error deleting recipe:', err));
        }
    };

    useEffect(() => {
        const loadFavorites = async () => {
            const savedFavorites = loadFavoritesFromStorage();
            if (savedFavorites.length > 0) {
                const validatedFavorites = await validateAndCleanFavorites(savedFavorites);
                if (validatedFavorites.length !== savedFavorites.length) {
                    setFavorites(validatedFavorites);
                    saveFavoritesToStorage(validatedFavorites);
                } else {
                    setFavorites(validatedFavorites);
                }
            }
        };

        loadFavorites();
    }, []);

    useEffect(() => {
        if (selectedCategory) {
            fetchRecipes(selectedCategory, selectedIngredients);
        }
        fetchIngredients();
    }, [selectedCategory, selectedIngredients]);

    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'favorites') {
                try {
                    const newFavorites = JSON.parse(e.newValue || '[]');
                    setFavorites(newFavorites);
                } catch (error) {
                    console.error('Error parsing favorites from storage event:', error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const handleNewRecipeChange = (index, field, value) => {
        const updatedIngredients = [...newRecipe.ingredients];
        updatedIngredients[index][field] = value;
        setNewRecipe({ ...newRecipe, ingredients: updatedIngredients });
    };

    const handleAddIngredient = () => {
        setNewRecipe({
            ...newRecipe,
            ingredients: [...newRecipe.ingredients, { name: '', quantity: '' }]
        });
    };

    const handleRemoveIngredient = (index) => {
        if (newRecipe.ingredients.length > 1) {
            const updatedIngredients = newRecipe.ingredients.filter((_, i) => i !== index);
            setNewRecipe({ ...newRecipe, ingredients: updatedIngredients });
        }
    };

    const handleNewRecipeInputChange = (field, value) => {
        setNewRecipe({ ...newRecipe, [field]: value });
    };

    const handleSubmitNewRecipe = (e) => {
        e.preventDefault();
        if (!selectedCategory) { alert('Ве молиме изберете категорија пред да зачувате рецепт.'); return; }
        if (!newRecipe.title.trim()) { alert('Ве молиме внесете наслов на рецептот!'); return; }
        if (!newRecipe.instructions.trim()) { alert('Ве молиме внесете инструкции!'); return; }
        const emptyIngredients = newRecipe.ingredients.some(ing => !ing.name.trim() || !ing.quantity.trim());
        if (emptyIngredients) { alert('Ве молиме пополнете ги сите полиња за состојките!'); return; }

        const recipeWithCategory = {
            title: newRecipe.title,
            instructions: newRecipe.instructions,
            ingredients: newRecipe.ingredients,
            category: selectedCategory
        };

        fetch(`${API_BASE_URL}/recipes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recipeWithCategory)
        })
            .then(res => {
                if (!res.ok) return res.text().then(text => { throw new Error(`HTTP error! status: ${res.status}, message: ${text}`); });
                return res.json();
            })
            .then((savedRecipe) => {
                alert('Рецептот е успешно зачуван!');
                setNewRecipe({ title: '', instructions: '', ingredients: [{ name: '', quantity: '' }], category: '' });
                setShowForm(false);

                fetchRecipes(selectedCategory, selectedIngredients);
                fetchIngredients();
            })
            .catch(err => { console.error('Error saving recipe:', err); alert(`Грешка при зачувување на рецептот: ${err.message}`); });
    };

    const toggleFavorite = (recipe) => {
        if (!recipe.id) {
            alert('Грешка: Рецептот нема валиден ID. Ве молиме освежете ја страницата.');
            return;
        }

        let updated;
        const existingFavorite = favorites.find(f => f.id === recipe.id);

        if (existingFavorite) {
            updated = favorites.filter(f => f.id !== recipe.id);
        } else {
            const favoriteRecipe = {
                id: recipe.id,
                title: recipe.title,
                instructions: recipe.instructions,
                ingredients: recipe.ingredients,
                category: recipe.category,
                dateAdded: new Date().toISOString()
            };
            updated = [...favorites, favoriteRecipe];
        }

        setFavorites(updated);
        saveFavoritesToStorage(updated);
    };

    const resetFiltersAndGoBack = () => {
        setSelectedCategory('');
        setRecipes([]);
        setShowForm(false);
        setSelectedIngredients([]);
        setShowFavorites(false);
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>
                    <span className="header-icon">👩‍🍳</span>
                    Рецепти Апликација
                </h1>
            </header>

            <main className="main-content">
                {!selectedCategory && !showFavorites && (
                    <div className="main-menu">
                        <div className="welcome-section">
                            <h2>Добредојдовте во светот на вкусни рецепти!</h2>
                            <p>Изберете категорија за да започнете</p>
                        </div>

                        <div className="category-grid">
                            {categories.map(cat => (
                                <div key={cat.id} className="category-card" onClick={() => setSelectedCategory(cat.id)}>
                                    <div className="card-icon">{cat.icon}</div>
                                    <h3>{cat.name}</h3>
                                    <div className="card-arrow">→</div>
                                </div>
                            ))}
                        </div>

                        {favorites.length > 0 && (
                            <div className="favorites-quick-access">
                                <button className="favorites-btn" onClick={() => setShowFavorites(true)}>
                                    <span>❤️</span>
                                    Омилени рецепти
                                    <span className="favorites-count">({favorites.length})</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {showFavorites && (
                    <div className="favorites-section">
                        <div className="section-header">
                            <button className="back-btn" onClick={() => setShowFavorites(false)}>
                                <span>←</span> Назад
                            </button>
                            <div className="header-content">
                                <h2>❤️ Омилени рецепти</h2>
                                <p>Ваши најсакани рецепти на едно место</p>
                            </div>
                        </div>

                        {favorites.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">❤️</div>
                                <h3>Сè уште нема омилени рецепти</h3>
                                <p>Означете рецепти како омилени за да ги видите овде</p>
                            </div>
                        ) : (
                            <div className="recipes-grid">
                                {favorites.map(recipe => (
                                    <div key={recipe.id} className="recipe-card compact">
                                        <div className="recipe-header">
                                            <h3>{recipe.title}</h3>
                                            <button className="favorite-btn active" onClick={() => toggleFavorite(recipe)}>
                                                💖
                                            </button>
                                        </div>
                                        <div className="recipe-preview">
                                            <div className="ingredients-preview">
                                                <strong>Состојки:</strong>
                                                <div className="ingredients-tags">
                                                    {recipe.ingredients.slice(0, 3).map((ing, i) => (
                                                        <span key={i} className="ingredient-tag">{ing.name}</span>
                                                    ))}
                                                    {recipe.ingredients.length > 3 && (
                                                        <span className="ingredient-tag more">+{recipe.ingredients.length - 3} повеќе</span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="instructions-preview">{recipe.instructions.substring(0, 100)}...</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {selectedCategory && !showFavorites && (
                    <div className="recipes-section">
                        <div className="section-header">
                            <button className="back-btn" onClick={resetFiltersAndGoBack}>
                                <span>←</span> Назад
                            </button>
                            <div className="header-content">
                                <h2>{selectedCategory}</h2>
                                <p>Откријте нови рецепти или додадете свои</p>
                            </div>
                            <button className={`add-recipe-btn ${showForm ? 'active' : ''}`} onClick={() => setShowForm(!showForm)}>
                                <span>{showForm ? '✕' : '+'}</span>
                                {showForm ? 'Откажи' : 'Додади рецепт'}
                            </button>
                        </div>

                        {showForm && (
                            <div className="form-container">
                                <form onSubmit={handleSubmitNewRecipe} className="recipe-form">
                                    <div className="form-header">
                                        <h3>Нов рецепт</h3>
                                        <p>Споделете го вашиот омилен рецепт со другите</p>
                                    </div>

                                    <div className="form-grid">
                                        <div className="form-section">
                                            <label className="form-label">Наслов на рецептот</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder=""
                                                value={newRecipe.title}
                                                onChange={(e) => handleNewRecipeInputChange('title', e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="form-section full-width">
                                            <label className="form-label">Инструкции за подготовка</label>
                                            <textarea
                                                className="form-textarea"
                                                placeholder="Опишете ги чекорите за подготовка на рецептот"
                                                value={newRecipe.instructions}
                                                onChange={(e) => handleNewRecipeInputChange('instructions', e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="form-section full-width">
                                            <div className="ingredients-header">
                                                <label className="form-label">Состојки</label>
                                                <button
                                                    type="button"
                                                    className="add-ingredient-btn"
                                                    onClick={handleAddIngredient}
                                                >
                                                    + Додади состојка
                                                </button>
                                            </div>
                                            <div className="ingredients-list">
                                                {newRecipe.ingredients.map((ing, index) => (
                                                    <div key={index} className="ingredient-row">
                                                        <input
                                                            type="text"
                                                            placeholder="Компир"
                                                            className="ingredient-name"
                                                            value={ing.name}
                                                            onChange={(e) => handleNewRecipeChange(index, 'name', e.target.value)}
                                                            required
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="2 kg"
                                                            className="ingredient-quantity"
                                                            value={ing.quantity}
                                                            onChange={(e) => handleNewRecipeChange(index, 'quantity', e.target.value)}
                                                            required
                                                        />
                                                        {newRecipe.ingredients.length > 1 && (
                                                            <button
                                                                type="button"
                                                                className="remove-ingredient-btn"
                                                                onClick={() => handleRemoveIngredient(index)}
                                                                title="Отстрани состојка"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-actions">
                                        <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>
                                            Откажи
                                        </button>
                                        <button type="submit" className="submit-btn">
                                            <span></span>
                                            Зачувај рецепт
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}


                        {recipes.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">🍽️</div>
                                <h3>Нема рецепти во оваа категорија</h3>
                                <p>Бидете први кој ќе додаде рецепт!</p>
                                <button className="start-cooking-btn" onClick={() => setShowForm(true)}>
                                    Додади рецепт
                                </button>
                            </div>
                        ) : (
                            <div className="recipes-grid">
                                {recipes.map(recipe => (
                                    <div key={recipe.id} className="recipe-card">
                                        <div className="recipe-header">
                                            <h3>{recipe.title}</h3>
                                            <div className="recipe-actions">
                                                <button
                                                    className="action-btn favorite-btn"
                                                    onClick={() => toggleFavorite(recipe)}
                                                    title={favorites.find(f => f.id === recipe.id) ? "Отстрани од омилени" : "Додади во омилени"}
                                                >
                                                    {favorites.find(f => f.id === recipe.id) ? '💖' : '🤍'}
                                                </button>
                                                <button
                                                    className="action-btn delete-btn"
                                                    onClick={() => deleteRecipe(recipe.id)}
                                                    title="Избриши рецепт"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>

                                        <div className="recipe-preview">
                                            <div className="ingredients-preview">
                                                <strong>Состојки:</strong>
                                                <div className="ingredients-tags">
                                                    {recipe.ingredients.slice(0, 3).map((ing, i) => (
                                                        <span key={i} className="ingredient-tag">{ing.name}</span>
                                                    ))}
                                                    {recipe.ingredients.length > 3 && (
                                                        <span className="ingredient-tag more">+{recipe.ingredients.length - 3} повеќе</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            className="show-details-btn"
                                            onClick={() => toggleIngredients(recipe.id)}
                                        >
                                            {recipe.showIngredients ? 'Сокриј детали' : 'Прикажи детали'}
                                            <span>{recipe.showIngredients ? '▲' : '▼'}</span>
                                        </button>

                                        {recipe.showIngredients && (
                                            <div className="recipe-details">
                                                <div className="details-section">
                                                    <h4> Инструкции</h4>
                                                    <p className="instructions">{recipe.instructions}</p>
                                                </div>

                                                <div className="details-section">
                                                    <h4> Потребни состојки</h4>
                                                    <ul className="ingredients-list-detail">
                                                        {recipe.ingredients.map((ing, index) => (
                                                            <li key={index}>
                                                                <span className="ingredient-name">{ing.name}</span>
                                                                <span className="ingredient-quantity">{ing.quantity}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;