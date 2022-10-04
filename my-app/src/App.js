import React, { Chromatic, Painting } from 'react'
import './App.css';
import './components/Painting.css';

function App() {
  return (
		<div className='App'>
			<header className='App-header'>
				<Chromatic />
				<Painting className='nigga' />
				<p>
					Edit <code>src/App.js</code> and save to reload.
				</p>
				<a
					className='App-link'
					href='https://reactjs.org'
					target='_blank'
					rel='noopener noreferrer'>
					Learn React
				</a>
			</header>
			<a href class='link' onClick="preloader(true, 'black', 'red');">
				Refresh
			</a>
		</div>
	);
}

export default App;
