import { auth, db } from "../js/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- AUTH LISTENER & LOGOUT ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "../index.html";
    }
});

document.getElementById("logout-btn").addEventListener("click", () => {
    signOut(auth).then(() => { window.location.href = "../index.html"; });
});

// --- HOUSE MANAGEMENT LOGIC ---
const addHouseForm = document.getElementById("add-house-form");
const houseListBody = document.getElementById("house-list-body");

if (addHouseForm) {
    addHouseForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("house-name").value;
        const rent = document.getElementById("house-rent").value;
        const code = document.getElementById("house-code").value;

        try {
            await addDoc(collection(db, "houses"), {
                name: name,
                rent: Number(rent),
                code: code,
                status: "vacant",
                tenantIds: []
            });

            alert(`Success! House ${name} created. Code: ${code}`);
            addHouseForm.reset();
            loadHouses(); 

        } catch (error) {
            console.error("Error adding house: ", error);
            alert("Error creating house.");
        }
    });
}

async function loadHouses() {
    if (!houseListBody) return; 

    houseListBody.innerHTML = ""; 
    try {
        const querySnapshot = await getDocs(collection(db, "houses"));
        
        querySnapshot.forEach((doc) => {
            const house = doc.data();
            const row = `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 1rem;">${house.name}</td>
                    <td style="padding: 1rem;"><span class="badge" style="background:#eee; padding: 4px 8px; border-radius: 4px;">${house.code}</span></td>
                    <td style="padding: 1rem;">KES ${house.rent}</td>
                    <td style="padding: 1rem;">
                        <span style="color: ${house.status === 'vacant' ? 'var(--primary-orange)' : 'var(--primary-green)'}; font-weight: 500; text-transform: capitalize;">
                            ${house.status}
                        </span>
                    </td>
                </tr>
            `;
            houseListBody.innerHTML += row;
        });
    } catch (error) {
        console.error("Error loading houses:", error);
    }
}

loadHouses();
