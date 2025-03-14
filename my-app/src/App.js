/** @format */

import React from 'react';
import * as Painting from './components/Painting';
import * as Chromatic from './components/Chromatic';
import './App.css';
import './components/Painting.css';

function App() {
	return (
		<div className='App'>
			<header className='App-header'>
				<Chromatic />
				<Painting className='shadow' />
			</header>
		</div>
	);
}

export default App;
