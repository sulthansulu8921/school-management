import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, X } from 'lucide-react';
import api from '../services/api';

const Students = () => {
    const [students, setStudents] = useState([]);
    const [search, setSearch] = useState('');
    const [filterClass, setFilterClass] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentStudent, setCurrentStudent] = useState(null);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthName = monthNames[new Date().getMonth()];

    const [formData, setFormData] = useState({
        admission_no: '',
        name: '',
        student_class: '',
        division: '',
        phone_number: '',
        bus_number: '',
        bus_fee: '',
        tuition_fee: '',
        status: 'Active',
        starting_month: currentMonthName
    });
    const [isCustomBus, setIsCustomBus] = useState(false);

    useEffect(() => {
        fetchStudents();
    }, [search, filterClass]);

    const fetchStudents = async () => {
        try {
            const response = await api.get('students/', {
                params: { search, student_class: filterClass }
            });
            setStudents(response.data.results || response.data);
        } catch (error) {
            console.error('Failed to fetch students', error);
        }
    };

    const handleOpenModal = (student = null) => {
        if (student) {
            setCurrentStudent(student);
            setFormData(student);
        } else {
            setCurrentStudent(null);
            setFormData({
                admission_no: '',
                name: '',
                student_class: '',
                division: '',
                phone_number: '',
                bus_number: '',
                bus_fee: '',
                tuition_fee: '',
                status: 'Active',
                starting_month: currentMonthName
            });
            setIsCustomBus(false);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'bus_number' && value === 'add_new') {
            setIsCustomBus(true);
            setFormData({ ...formData, bus_number: '' });
        } else if (name === 'bus_number' && isCustomBus && value !== '') {
            setFormData({ ...formData, [name]: value });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (currentStudent) {
                await api.put(`students/${currentStudent.id}/`, formData);
            } else {
                await api.post('students/', formData);
            }
            handleCloseModal();
            fetchStudents();
        } catch (error) {
            console.error('Error saving student', error);
            alert('Failed to save student info: ' + (error.response?.data?.detail || JSON.stringify(error.response?.data) || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this student?')) {
            try {
                await api.delete(`students/${id}/`);
                fetchStudents();
            } catch (error) {
                console.error('Error deleting student', error);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Students</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                    <Plus size={20} />
                    <span>Add Student</span>
                </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, admission no, or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    />
                </div>
                <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                    <option value="">All Classes</option>
                    <option value="1">Class 1</option>
                    <option value="2">Class 2</option>
                    <option value="3">Class 3</option>
                    <option value="4">Class 4</option>
                    <option value="5">Class 5</option>
                    <option value="6">Class 6</option>
                    <option value="7">Class 7</option>
                    <option value="8">Class 8</option>
                    <option value="9">Class 9</option>
                    <option value="10">Class 10</option>
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admission No</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class / Div</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus No</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus Fee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tuition Fee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {students.length > 0 ? (
                            students.map((student) => (
                                <tr key={student.id} className="hover:bg-gray-50 text-sm">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{student.admission_no}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{student.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                        {student.student_class} - {student.division}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{student.phone_number}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{student.bus_number || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-semibold">₹{student.bus_fee || '0.00'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-semibold">₹{student.tuition_fee || '0.00'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${student.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {student.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleOpenModal(student)} className="text-blue-600 hover:text-blue-900 mx-2">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(student.id)} className="text-red-600 hover:text-red-900 ml-2">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No students found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4 relative">
                        <button onClick={handleCloseModal} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>
                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                            {currentStudent ? 'Edit Student' : 'Add New Student'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Admission No</label>
                                <input required type="text" name="admission_no" value={formData.admission_no} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Class</label>
                                    <input required type="text" name="student_class" value={formData.student_class} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Division</label>
                                    <input required type="text" name="division" value={formData.division} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                <input required type="text" name="phone_number" value={formData.phone_number} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Bus Number</label>
                                    {!isCustomBus ? (
                                        <select
                                            name="bus_number"
                                            value={formData.bus_number}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                        >
                                            <option value="">No Bus</option>
                                            <option value="1">Bus 1</option>
                                            <option value="2">Bus 2</option>
                                            <option value="3">Bus 3</option>
                                            <option value="4">Bus 4</option>
                                            <option value="5">Bus 5</option>
                                            <option value="add_new">+ Add New Number</option>
                                        </select>
                                    ) : (
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="bus_number"
                                                placeholder="Enter Bus No"
                                                value={formData.bus_number}
                                                onChange={handleChange}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setIsCustomBus(false)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
                                            >
                                                Select
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Bus Fee (₹)</label>
                                    <input
                                        type="number"
                                        name="bus_fee"
                                        step="0.01"
                                        value={formData.bus_fee}
                                        onChange={handleChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tuition Fee (₹)</label>
                                    <input
                                        type="number"
                                        name="tuition_fee"
                                        step="0.01"
                                        value={formData.tuition_fee}
                                        onChange={handleChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <select name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Joining Month (Fees Start From)</label>
                                <select name="starting_month" value={formData.starting_month} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={handleCloseModal} className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Students;
