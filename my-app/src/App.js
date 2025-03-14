/** @format */

import React, { Painting } from 'react';
import './App.css';
import './components/Painting.css';

function App() {
	return (
		<div className='App'>
			<header className='App-header'>
				{/* <Chromatic /> */}
				<Painting className='shadow' />
			</header>
		</div>
	);
}

export default App;
