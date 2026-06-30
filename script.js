// Get elements
const userInput = document.getElementById("usernameInput");
const searchBtn = document.getElementById("searchBtn");

// paste your token here
const GITHUB_TOKEN = "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"; 

async function searchUser() {
    let username = userInput.value.trim();
    if (!username) return alert("Please enter a username");

    // Headers configuration
    const headers = {
        "Authorization": `token ${GITHUB_TOKEN}`
    };

    try {
        // User API with token authentication
        let userRes = await fetch(`https://api.github.com/users/${username}`, { headers });
        
        if (!userRes.ok) {
            throw new Error(`Error: ${userRes.status} - User not found or limit reached`);
        }
        
        let user = await userRes.json();

        // Repository API with token authentication
        let repoRes = await fetch(`https://api.github.com/users/${username}/repos`, { headers });
        let repos = await repoRes.json();

        // User Details
        document.getElementById("userName").textContent = user.name || user.login;
        document.getElementById("userAvatar").src = user.avatar_url;
        document.getElementById("followers").textContent = user.followers;
        document.getElementById("repos").textContent = user.public_repos;

        // Repository List
        let output = "";
        repos.forEach(repo => {
            output += `
                <div class="repo-item">
                    <h3>${repo.name}</h3>
                    <p>${repo.description || "No Description"}</p>
                    <p>⭐ ${repo.stargazers_count}</p>
                    <a href="${repo.html_url}" target="_blank">View Repo</a>
                </div>
            `;
        });

        document.getElementById("repoList").innerHTML = output;

    } catch (error) {
        alert(error.message);
        document.getElementById("userName").textContent = "Not Found";
        document.getElementById("userAvatar").src = "";
        document.getElementById("followers").textContent = "0";
        document.getElementById("repos").textContent = "0";
        document.getElementById("repoList").innerHTML = "";
    }
}

searchBtn.addEventListener("click", searchUser);
