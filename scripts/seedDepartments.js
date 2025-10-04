const mongoose = require('mongoose');
require('dotenv').config();

const Department = require('../models/Department');

// Department data
const departments = [
    {
        name: "Academic Department",
        description: "Focuses on teaching, curriculum development, and student learning across all subject areas."
    },
    {
        name: "Administrative Department",
        description: "Manages school operations, student records, finances, and support services."
    },
    {
        name: "Maintenance and Facilities Department",
        description: "Ensures the cleanliness, safety, and upkeep of the school's physical environment."
    }
];

const seedDepartments = async () => {
    try {
        // Connect to database
        const mongoURI = process.env.MONGODB_URI;
        
        console.log('Connecting to MongoDB...');
        console.log('Database: BrightonSystem');
        console.log('Collection: EMS_Department');
        
        await mongoose.connect(mongoURI);

        console.log('Connected to MongoDB: BrightonSystem');
        console.log('Seeding departments into EMS_Department collection...');
        
        // Clear existing departments
        const deleteResult = await Department.deleteMany({});
        console.log(`Cleared ${deleteResult.deletedCount} existing departments`);
        
        // Insert new departments
        const result = await Department.insertMany(departments);
        console.log(`Successfully seeded ${result.length} departments into EMS_Department collection:`);
        
        result.forEach(dept => {
            console.log(`   - ${dept.name}`);
        });

        // Verify the data was saved
        const count = await Department.countDocuments();
        console.log(`Total departments in database: ${count}`);
        
        console.log('Department seeding completed successfully!');
        
    } catch (error) {
        console.error('Error seeding departments:', error);
        process.exit(1);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
    }
};

// Run the seed function
seedDepartments();