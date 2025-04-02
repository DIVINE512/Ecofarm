import React from 'react';
import CategoryItem from '../components/CategoryItem.jsx';

const categories = [
    { href: "/seeds", name: "seeds", imageUrl: "seeds.jpg" },
    { href: "/seeds-sowing", name: "seeds-sowing", imageUrl: "seeds-sowing.jpg" },
    { href: "/power-weeders", name: "power-weeders", imageUrl: "power-weeders.jpg" },
    { href: "/spray-machine", name: "spray-machine", imageUrl: "spray-machine.jpg" },
    { href: "/grass-cutting-machine", name: "grass-cutting-machine", imageUrl: "grass-cutting-machine.jpg" },
    { href: "/essential-tools", name: "essential-tools", imageUrl: "essentials-tools.jpg" }, 
    { href: "/earth-auger", name: "earth-auger", imageUrl: "earth-auger.jpg" },
    { href: "/chainsaw", name: "chainsaw", imageUrl: "chainsaw.jpg" }, 
];

  
  

const HomePage = () => {
    return (
        <div className='relative min-h-screen text-white overflow-hidden'>
			<div className='relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16'>
				<h1 className='text-center text-5xl sm:text-6xl font-bold text-emerald-400 mb-4'>
					Explore Our Categories
				</h1>
				<p className='text-center text-xl text-gray-300 mb-12'>
					Discover the latest tools in Eco-Farm 
				</p>

				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
					{categories.map((category) => (
						<CategoryItem category={category} key={category.name} />
					))}
				</div> 
			</div>
        </div>
    );
};

export default HomePage;
